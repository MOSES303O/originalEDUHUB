from django.db.models import Q, Count, Avg
from requests import Response
from .models import Course, CourseSubjectRequirement, Subject
import logging
from rest_framework import status

logger = logging.getLogger(__name__)


class CourseMatchingEngine:
    """
    Engine for matching courses based on user subjects and preferences
    """
    
    # Grade point mapping for comparison
    GRADE_POINTS = {
        'A': 12, 'A-': 11, 'B+': 10, 'B': 9, 'B-': 8,
        'C+': 7, 'C': 6, 'C-': 5, 'D+': 4, 'D': 3, 'D-': 2
    }

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def match_courses(self, user_subjects, preferred_categories=None, 
                     max_tuition_fee=None, preferred_universities=None):
        """
        Match courses based on user subjects and preferences
        
        Args:
            user_subjects: List of dicts with subject_id and grade
            preferred_categories: List of preferred course categories
            max_tuition_fee: Maximum tuition fee filter
            preferred_universities: List of preferred university IDs
            
        Returns:
            QuerySet of matched courses ordered by match score
        """
        try:
            # Start with active courses
            courses = Course.objects.filter(is_active=True).select_related('university')
            
            # Apply basic filters first
            if max_tuition_fee:
                courses = courses.filter(tuition_fee_per_year__lte=max_tuition_fee)
            
            if preferred_categories:
                courses = courses.filter(category__in=preferred_categories)
            
            if preferred_universities:
                courses = courses.filter(university_id__in=preferred_universities)
            
            # Get user subject IDs and grades
            user_subject_data = {
                item['subject_id']: item['grade'] for item in user_subjects
            }
            user_subject_ids = list(user_subject_data.keys())
            
            # Find courses that match user subjects
            matched_courses = []
            
            for course in courses:
                match_score = self._calculate_match_score(course, user_subject_data)
                if match_score > 0:
                    course.match_score = match_score
                    matched_courses.append(course)
            
            # Sort by match score (highest first)
            matched_courses.sort(key=lambda x: x.match_score, reverse=True)
            
            self.logger.info(f"Matched {len(matched_courses)} courses for user subjects")
            return matched_courses
            
        except Exception as e:
            self.logger.error(f"Error in course matching: {str(e)}")
            return []

    def _calculate_match_score(self, course, user_subject_data):
        """
        Calculate match score for a course based on user subjects
        
        Args:
            course: Course object
            user_subject_data: Dict of subject_id -> grade
            
        Returns:
            Float match score (0-100)
        """
        try:
            # Get course requirements
            requirements = CourseSubjectRequirement.objects.filter(
                course=course
            ).select_related('subject')
            
            if not requirements.exists():
                return 0
            
            total_requirements = requirements.count()
            mandatory_requirements = requirements.filter(is_mandatory=True).count()
            
            matched_mandatory = 0
            matched_optional = 0
            grade_bonus = 0
            
            for requirement in requirements:
                subject_id = str(requirement.subject.id)
                
                # Check if user has this subject
                if subject_id in user_subject_data:
                    user_grade = user_subject_data[subject_id]
                    required_grade = requirement.minimum_grade
                    
                    # Check if user's grade meets requirement
                    if self._grade_meets_requirement(user_grade, required_grade):
                        if requirement.is_mandatory:
                            matched_mandatory += 1
                        else:
                            matched_optional += 1
                        
                        # Bonus for exceeding minimum grade
                        grade_bonus += self._calculate_grade_bonus(user_grade, required_grade)
                
                # Check alternative subjects
                else:
                    for alt_subject in requirement.alternative_subjects.all():
                        alt_subject_id = str(alt_subject.id)
                        if alt_subject_id in user_subject_data:
                            user_grade = user_subject_data[alt_subject_id]
                            if self._grade_meets_requirement(user_grade, requirement.minimum_grade):
                                if requirement.is_mandatory:
                                    matched_mandatory += 1
                                else:
                                    matched_optional += 1
                                break
            
            # Calculate base score
            if mandatory_requirements > 0:
                mandatory_score = (matched_mandatory / mandatory_requirements) * 70
            else:
                mandatory_score = 70  # No mandatory requirements
            
            optional_score = (matched_optional / max(total_requirements - mandatory_requirements, 1)) * 20
            
            # Total score with grade bonus
            total_score = mandatory_score + optional_score + min(grade_bonus, 10)
            
            # Must meet all mandatory requirements to be eligible
            if mandatory_requirements > 0 and matched_mandatory < mandatory_requirements:
                return 0
            
            return min(total_score, 100)
            
        except Exception as e:
            self.logger.error(f"Error calculating match score: {str(e)}")
            return 0

    def _grade_meets_requirement(self, user_grade, required_grade):
        """
        Check if user's grade meets the requirement
        
        Args:
            user_grade: User's grade (e.g., 'B+')
            required_grade: Required minimum grade (e.g., 'C+')
            
        Returns:
            Boolean indicating if requirement is met
        """
        user_points = self.GRADE_POINTS.get(user_grade, 0)
        required_points = self.GRADE_POINTS.get(required_grade, 0)
        return user_points >= required_points

    def _calculate_grade_bonus(self, user_grade, required_grade):
        """
        Calculate bonus points for exceeding minimum grade
        
        Args:
            user_grade: User's grade
            required_grade: Required minimum grade
            
        Returns:
            Float bonus points
        """
        user_points = self.GRADE_POINTS.get(user_grade, 0)
        required_points = self.GRADE_POINTS.get(required_grade, 0)
        
        if user_points > required_points:
            return (user_points - required_points) * 0.5
        return 0

    def get_recommended_courses(self, user, limit=10):
        """
        Get recommended courses for a user based on their profile and selections
        
        Args:
            user: User object
            limit: Maximum number of recommendations
            
        Returns:
            List of recommended courses
        """
        try:
            # Get user's selected courses to understand preferences
            selected_courses = user.selected_courses.all().select_related('course')
            
            if not selected_courses.exists():
                # Return popular courses if no selections
                return Course.objects.filter(is_active=True).annotate(
                    selection_count=Count('userselectedcourse')
                ).order_by('-selection_count')[:limit]
            
            # Analyze user preferences
            preferred_categories = list(
                selected_courses.values_list('course__category', flat=True).distinct()
            )
            
            preferred_universities = list(
                selected_courses.values_list('course__university', flat=True).distinct()
            )
            
            # Get user's subjects if available
            user_subjects = []
            if hasattr(user, 'usersubject_set'):
                user_subjects = [
                    {'subject_id': str(us.subject.id), 'grade': us.grade}
                    for us in user.usersubject_set.all()
                ]
            
            # Find similar courses
            recommendations = Course.objects.filter(
                is_active=True
            ).exclude(
                id__in=selected_courses.values_list('course_id', flat=True)
            )
            
            # Prefer same categories and universities
            recommendations = recommendations.filter(
                Q(category__in=preferred_categories) |
                Q(university__in=preferred_universities)
            ).distinct()
            
            # If user has subjects, use matching engine
            if user_subjects:
                matched_courses = self.match_courses(user_subjects)
                # Convert to list of IDs for filtering
                matched_ids = [course.id for course in matched_courses[:limit*2]]
                recommendations = recommendations.filter(id__in=matched_ids)
            
            return recommendations.annotate(
                avg_rating=Avg('reviews__rating', filter=Q(reviews__is_approved=True))
            ).order_by('-avg_rating', 'name')[:limit]
            
        except Exception as e:
            self.logger.error(f"Error getting recommendations: {str(e)}")
            return Course.objects.filter(is_active=True)[:limit]


class CourseAnalytics:
    """
    Analytics utilities for course data
    """
    
    @staticmethod
    def get_popular_courses(limit=10):
        """Get most popular courses by selection count"""
        return Course.objects.filter(is_active=True).annotate(
            selection_count=Count('userselectedcourse')
        ).order_by('-selection_count')[:limit]
    
    @staticmethod
    def get_top_rated_courses(limit=10):
        """Get top-rated courses"""
        return Course.objects.filter(is_active=True).annotate(
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_approved=True)),
            review_count=Count('reviews', filter=Q(reviews__is_approved=True))
        ).filter(review_count__gte=5).order_by('-avg_rating')[:limit]
    
    @staticmethod
    def get_course_trends():
        """Get course selection trends by category"""
        return Course.objects.filter(is_active=True).values('category').annotate(
            total_courses=Count('id'),
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
            "errors": errors
        }, status=status.HTTP_400_BAD_REQUEST)    