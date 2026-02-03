# apps/courses/utils.py or wherever this is
from django.db.models import Q, Count, Avg
from rest_framework.response import Response
from rest_framework import status
from .models import Program, ProgramSubjectRequirement, CourseOffering, Subject
from apps.authentication.models import UserSubject,User
from typing import List, Tuple, Dict, Any
from typing import Optional
import logging


logger = logging.getLogger(__name__)

class CourseMatchingEngine:
    """
    Engine for matching and qualifying courses based on KCSE cluster system.
    
    Qualification order:
    1. ≥7 subjects with grades
    2. Cluster rules (mandatory subjects/groups, alternatives, any-from count)
    3. Meets ProgramSubjectRequirement minimum grades
    4. Final: effective cluster points ≥ CourseOffering.cluster_requirements
    """

    GRADE_POINTS = {
        'A': 12, 'A-': 11, 'B+': 10, 'B': 9, 'B-': 8,
        'C+': 7, 'C': 6, 'C-': 5, 'D+': 4, 'D': 3,
        'D-': 2, 'E': 1,
    }

    CLUSTER_GROUPS = {
        'GROUP_I': ['English', 'Kiswahili'],
        'GROUP_II': ['Mathematics', 'Alternative Mathematics'],
        'GROUP_III': ['History & Government', 'Geography', 'CRE', 'IRE', 'HRE', 'Business Studies'],
        'GROUP_IV': ['Home Science', 'Art & Design', 'Agriculture', 'Computer Studies', 'Music', 'Building Construction'],
        'GROUP_V': ['French', 'German', 'Arabic', 'Sign Language', 'Woodwork', 'Metalwork', 'Power Mechanics', 'Electricity', 'Drawing & Design', 'Aviation Technology'],
    }

    CLUSTER_RULES = {
        1: {
            'name': 'Cluster 1 – General / Arts / Education',
            'mandatory': [
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'B'},
                {'alternative': 'MAT_ALT', 'min_grade': 'B+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        2: {
            'name': 'Cluster 2 – Business / Law / Management',
            'mandatory': [
                {'group': 'GROUP_I', 'min_grade': 'B'},
            ],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'B'},
                {'alternative': 'MAT_ALT', 'min_grade': 'B+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        3: {
            'name': 'Cluster 3 – Communication / Media / Journalism',
            'mandatory': [
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'C+'},
                {'alternative': 'MAT_ALT', 'min_grade': 'C+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        4: {
            'name': 'Cluster 4 – Arts / Design / Animation',
            'mandatory': [
                {'subject': 'Mathematics Alternative', 'min_grade': 'A-'},
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'C+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        5: {
            'name': 'Cluster 5 – Engineering / Technical',
            'mandatory': [
                {'subject': 'Physics', 'min_grade': 'C+'},
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'B'},
                {'alternative': 'MAT_ALT', 'min_grade': 'B+'},
            ],
            'any_from': [
                {'subject': 'Chemistry', 'min_grade': 'C+'},
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 2, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        6: {
            'name': 'Cluster 6 – Health Sciences / Medicine',
            'mandatory': [
                {'subject': 'Biology', 'min_grade': 'B'},
                {'subject': 'Chemistry', 'min_grade': 'B'},
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'B'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 1, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        7: {
            'name': 'Cluster 7 – Education / Arts',
            'mandatory': [
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'C+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 4, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        8: {
            'name': 'Cluster 8 – Co-operative / Entrepreneurship / Management',
            'mandatory': [
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'C+'},
                {'alternative': 'MAT_ALT', 'min_grade': 'C+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        9: {
            'name': 'Cluster 9 – Agribusiness / Agriculture / Food',
            'mandatory': [
                {'group': 'GROUP_I', 'min_grade': 'C+'},
                {'subject': 'Biology', 'min_grade': 'C+'},
                {'subject': 'Agriculture', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'C+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 2, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        10: {
            'name': 'Cluster 10 – Pure Sciences / Actuarial / Statistics',
            'mandatory': [
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'B'},
                {'alternative': 'MAT_ALT', 'min_grade': 'B+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        11: {
            'name': 'Cluster 11 – Interior Design / Fashion / Textiles',
            'mandatory': [
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'C+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 4, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        12: {
            'name': 'Cluster 12 – Sports / Recreation / Management',
            'mandatory': [
                {'subject': 'Biology', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'subject': 'Chemistry', 'min_grade': 'C+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        13: {
            'name': 'Cluster 13 – Health / Dental / Pharmacy',
            'mandatory': [
                {'subject': 'Biology', 'min_grade': 'B'},
                {'subject': 'Chemistry', 'min_grade': 'B'},
            ],
            'required_one_of': [
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 1, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        14: {
            'name': 'Cluster 14 – History / Archaeology / Anthropology',
            'mandatory': [
                {'subject': 'History & Government', 'min_grade': 'C+'},
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'C+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        15: {
            'name': 'Cluster 15 – International Studies / Diplomacy',
            'mandatory': [
                {'subject': 'Biology', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'subject': 'Chemistry', 'min_grade': 'C+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        16: {
            'name': 'Cluster 16 – Environmental / Resource Management',
            'mandatory': [
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'C+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 4, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        17: {
            'name': 'Cluster 17 – Geography / Natural Resources',
            'mandatory': [
                {'subject': 'Geography', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'C+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
        18: {
            'name': 'Cluster 18 – Public Health / Community Health',
            'mandatory': [
                {'subject': 'Biology', 'min_grade': 'C+'},
                {'subject': 'Chemistry', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'any_from': [
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 2, 'min_grade': 'C+'},
            ],
            'min_points': 46,
        },
    }

    def calculate_cluster_points_from_subjects(self, user_subjects: List[UserSubject]) -> float:
        points_list = [self.GRADE_POINTS.get(us.grade, 0) for us in user_subjects if us.grade]
        if len(points_list) < 7:
            return 0.0
        points_list.sort(reverse=True)
        return float(sum(points_list[:7]))

    def get_effective_cluster_points(self, user: User, user_subjects: List[UserSubject]) -> float:
        stored = user.cluster_points
        if stored is None or stored <= 0.000:
            return self.calculate_cluster_points_from_subjects(user_subjects)
        return float(stored)

    def check_user_qualification_for_course_offering(
            self,
            user: User,
            offering: CourseOffering
        ) -> Tuple[bool, Dict[str, Any]]:
            """
            Full qualification check for a specific CourseOffering.

            Order:
            1. ≥7 subjects with grades
            2. Cluster rules (mandatory, alternatives, any-from count)
            3. Program-specific mandatory grades (ProgramSubjectRequirement)
            4. Final: effective cluster points ≥ CourseOffering.cluster_requirements
            """
            # 1. Subject count check (earliest exit)
            user_subjects = user.subjects.filter(grade__isnull=False).select_related('subject')
            num_subjects = user_subjects.count()

            if num_subjects < 7:
                return False, {
                    "qualified": False,
                    "reason": f"Only {num_subjects} subjects with grades (minimum 7 required)",
                    "subjects_count": num_subjects,
                    "required_subjects": 7
                }

            # 2. Calculate effective cluster points **early** (needed for final check)
            effective_points = self.get_effective_cluster_points(user, user_subjects)

            # 3. Determine cluster number for rules lookup
            cluster_number = None
            name_lower = offering.program.name.lower()
            if any(word in name_lower for word in ['engineering', 'aviation', 'technology', 'industrial', 'mining', 'chemical']):
                cluster_number = 5
            elif any(word in name_lower for word in ['business', 'management', 'law', 'hospitality', 'co-operative', 'entrepreneurship']):
                cluster_number = 2
            elif any(word in name_lower for word in ['health', 'medicine', 'nursing', 'pharmacy', 'biomedical', 'dental', 'veterinary']):
                cluster_number = 6
            elif any(word in name_lower for word in ['arts', 'communication', 'journalism', 'media', 'education']):
                cluster_number = 3
            elif any(word in name_lower for word in ['agriculture', 'agribusiness', 'food', 'nutrition', 'fisheries', 'aquaculture']):
                cluster_number = 9
            else:
                cluster_number = 1  # default

            rules = self.CLUSTER_RULES.get(cluster_number, self.CLUSTER_RULES[1])

            # 4. Cluster rules check
            missing_mandatory = []
            for req in rules.get('mandatory', []):
                satisfied = False
                if 'subject' in req:
                    subj_name = req['subject']
                    if subj_name in [us.subject.name for us in user_subjects]:
                        # More precise: check actual grade
                        for us in user_subjects:
                            if us.subject.name == subj_name and self.GRADE_POINTS.get(us.grade, 0) >= self.GRADE_POINTS.get(req['min_grade'], 0):
                                satisfied = True
                                break
                elif 'group' in req:
                    group_subjs = self.CLUSTER_GROUPS.get(req['group'], [])
                    for gs in group_subjs:
                        for us in user_subjects:
                            if us.subject.name == gs and self.GRADE_POINTS.get(us.grade, 0) >= self.GRADE_POINTS.get(req['min_grade'], 0):
                                satisfied = True
                                break
                        if satisfied:
                            break
                        
                if not satisfied:
                    missing_mandatory.append({
                        "type": "mandatory",
                        "subject_or_group": req.get('subject', req.get('group')),
                        "min_grade": req['min_grade']
                    })

            # Required one-of alternatives
            one_of_satisfied = any(
                any(
                    us.subject.name == alt.get('subject') and self.GRADE_POINTS.get(us.grade, 0) >= self.GRADE_POINTS.get(alt['min_grade'], 0)
                    for us in user_subjects
                ) or any(
                    any(
                        us.subject.name == gs and self.GRADE_POINTS.get(us.grade, 0) >= self.GRADE_POINTS.get(alt['min_grade'], 0)
                        for gs in self.CLUSTER_GROUPS.get(alt.get('group', ''), [])
                    )
                    for us in user_subjects
                )
                for alt in rules.get('required_one_of', [])
            )

            if not one_of_satisfied:
                return False, {
                    "qualified": False,
                    "reason": "Missing required subject or alternative from cluster rules",
                    "missing_alternative": rules.get('required_one_of', [])
                }

            # Any-from count
            any_req = rules.get('any_from', [{}])[0]
            required_count = any_req.get('count', 0)
            min_grade = any_req.get('min_grade', 'E')
            allowed_groups = any_req.get('groups', [])

            any_met = 0
            for group_name in allowed_groups:
                group_subjs = self.CLUSTER_GROUPS.get(group_name, [])
                for gs in group_subjs:
                    if any(us.subject.name == gs and self.GRADE_POINTS.get(us.grade, 0) >= self.GRADE_POINTS.get(min_grade, 0) for us in user_subjects):
                        any_met += 1
                        break
                    
            if any_met < required_count:
                return False, {
                    "qualified": False,
                    "reason": f"Missing {required_count - any_met} subjects from allowed groups",
                    "missing_count": required_count - any_met,
                    "required_from_groups": allowed_groups
                }

            # 5. Program-specific mandatory grade requirements
            prog_reqs = ProgramSubjectRequirement.objects.filter(
                program=offering.program,
                is_mandatory=True
            ).select_related('subject')

            missing_prog_req = []
            unmet_prog_grade = []

            for req in prog_reqs:
                subj_id_str = str(req.subject_id)
                found = False
                for us in user_subjects:
                    if str(us.subject_id) == subj_id_str:
                        found = True
                        if req.minimum_grade and self.GRADE_POINTS.get(us.grade, 0) < self.GRADE_POINTS.get(req.minimum_grade, 0):
                            unmet_prog_grade.append({
                                "subject": req.subject.name,
                                "user_grade": us.grade,
                                "required_grade": req.minimum_grade
                            })
                        break
                if not found:
                    missing_prog_req.append({
                        "subject": req.subject.name,
                        "required_grade": req.minimum_grade or "Any"
                    })

            if missing_prog_req or unmet_prog_grade:
                return False, {
                    "qualified": False,
                    "reason": "Does not meet program-specific subject/grade requirements",
                    "missing_program_requirements": missing_prog_req,
                    "unmet_program_grades": unmet_prog_grade
                }

            # 6. FINAL CHECK: Compare effective cluster points against offering requirement
            required_points_str = offering.cluster_requirements.strip() if offering.cluster_requirements else None
            required_points = None

            if required_points_str:
                try:
                    required_points = float(required_points_str)
                    if effective_points < required_points:
                        return False, {
                            "qualified": False,
                            "reason": f"Cluster points too low ({effective_points:.3f} < {required_points:.3f})",
                            "user_points": effective_points,
                            "required_points": required_points,
                            "points_source": "stored" if user.cluster_points and user.cluster_points > 0 else "calculated"
                        }
                except ValueError:
                    logger.warning(f"Invalid cluster_requirements format '{required_points_str}' for {offering}")

            # All checks passed
            return True, {
                "qualified": True,
                "user_points": effective_points,
                "required_points": required_points,
                "points_source": "stored" if user.cluster_points and user.cluster_points > 0 else "calculated",
                "subjects_count": num_subjects,
                "cluster": cluster_number,
                "message": f"Qualified for {offering.program.name} at {offering.university.name}"
            }

    # ... (keep qualify_user_for_all_offerings and get_recommended_courses as before)
class CourseAnalytics:
    """
    Analytics utilities for course offerings
    """
    
    @staticmethod
    def get_popular_courses(limit=10):
        return CourseOffering.objects.filter(is_active=True).annotate(
            selection_count=Count('userselectedcourse')
        ).order_by('-selection_count')[:limit]
    
    @staticmethod
    def get_top_rated_courses(limit=10):
        return CourseOffering.objects.filter(is_active=True).annotate(
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_approved=True)),
            review_count=Count('reviews', filter=Q(reviews__is_approved=True))
        ).filter(review_count__gte=5).order_by('-avg_rating')[:limit]
    
    @staticmethod
    def get_course_trends():
        return CourseOffering.objects.filter(is_active=True).values(
            'program__category'
        ).annotate(
            total_offerings=Count('id'),
            total_selections=Count('userselectedcourse'),
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_approved=True))
        ).order_by('-total_selections')

class StandardAPIResponse:
    @staticmethod
    def success(data=None, message=""):
        return Response({
            "status": "success",
            "message": message,
            "data": data
        }, status=status.HTTP_200_OK)

    @staticmethod
    def error(message="", errors=None):
        return Response({
            "status": "error",
            "message": message,
            "errors": errors or {}
        }, status=status.HTTP_400_BAD_REQUEST)