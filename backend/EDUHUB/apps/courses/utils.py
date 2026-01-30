# apps/courses/utils.py or wherever this is
from django.db.models import Q, Count, Avg
from rest_framework.response import Response
from rest_framework import status
from .models import CourseOffering, CourseSubjectRequirement
import logging

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
        Match course offerings based on user subjects and preferences
        
        Args:
            user_subjects: List of dicts with subject_id and grade
            preferred_categories: List of preferred program categories
            max_tuition_fee: Maximum tuition fee filter
            preferred_universities: List of preferred university IDs
            
        Returns:
            List of matched CourseOffering objects ordered by match score
        """
        try:
            # Start with active course offerings
            offerings = CourseOffering.objects.filter(is_active=True).select_related('program', 'university')
            
            # Apply basic filters first
            if max_tuition_fee:
                offerings = offerings.filter(tuition_fee_per_year__lte=max_tuition_fee)
            
            if preferred_categories:
                offerings = offerings.filter(program__category__in=preferred_categories)
            
            if preferred_universities:
                offerings = offerings.filter(university_id__in=preferred_universities)
            
            # Get user subject IDs and grades
            user_subject_data = {
                item['subject_id']: item['grade'] for item in user_subjects
            }
            user_subject_ids = list(user_subject_data.keys())
            
            # Find matching offerings
            matched_offerings = []
            
            for offering in offerings:
                match_score = self._calculate_match_score(offering, user_subject_data)
                if match_score > 0:
                    offering.match_score = match_score
                    matched_offerings.append(offering)
            
            # Sort by match score (highest first)
            matched_offerings.sort(key=lambda x: x.match_score, reverse=True)
            
            self.logger.info(f"Matched {len(matched_offerings)} course offerings for user subjects")
            return matched_offerings
            
        except Exception as e:
            self.logger.error(f"Error in course matching: {str(e)}")
            return []

    def _calculate_match_score(self, offering, user_subject_data):
        """
        Calculate match score for a course offering based on user subjects
        
        Args:
            offering: CourseOffering object
            user_subject_data: Dict of subject_id -> grade
            
        Returns:
            Float match score (0-100)
        """
        try:
            # Get offering requirements
            requirements = CourseSubjectRequirement.objects.filter(
                course=offering
            ).select_related('subject')
            
            if not requirements.exists():
                return 0
            
            total_requirements = requirements.count()
            mandatory_requirements = requirements.filter(is_mandatory=True).count()
            
            matched_mandatory = 0
            matched_optional = 0
            grade_bonus = 0
            
            for requirement in requirements:
                subject_id = str(requirement.subject.id) if requirement.subject else None
                
                # Check if user has this subject
                if subject_id and subject_id in user_subject_data:
                    user_grade = user_subject_data[subject_id]
                    required_grade = requirement.minimum_grade
                    
                    if required_grade and self._grade_meets_requirement(user_grade, required_grade):
                        if requirement.is_mandatory:
                            matched_mandatory += 1
                        else:
                            matched_optional += 1
                        
                        grade_bonus += self._calculate_grade_bonus(user_grade, required_grade)
                
            # Calculate base score
            if mandatory_requirements > 0:
                mandatory_score = (matched_mandatory / mandatory_requirements) * 70
            else:
                mandatory_score = 70  # No mandatory requirements
            
            optional_score = (matched_optional / max(total_requirements - mandatory_requirements, 1)) * 20
            
            total_score = mandatory_score + optional_score + min(grade_bonus, 10)
            
            # Must meet all mandatory requirements
            if mandatory_requirements > 0 and matched_mandatory < mandatory_requirements:
                return 0
            
            return min(total_score, 100)
            
        except Exception as e:
            self.logger.error(f"Error calculating match score: {str(e)}")
            return 0

    def _grade_meets_requirement(self, user_grade, required_grade):
        user_points = self.GRADE_POINTS.get(user_grade, 0)
        required_points = self.GRADE_POINTS.get(required_grade, 0)
        return user_points >= required_points

    def _calculate_grade_bonus(self, user_grade, required_grade):
        user_points = self.GRADE_POINTS.get(user_grade, 0)
        required_points = self.GRADE_POINTS.get(required_grade, 0)
        if user_points > required_points:
            return (user_points - required_points) * 0.5
        return 0

    def get_recommended_courses(self, user, limit=10):
        """
        Get recommended course offerings for a user
        """
        try:
            selected = user.selected_courses.all()
            
            if not selected.exists():
                return CourseOffering.objects.filter(is_active=True).annotate(
                    selection_count=Count('userselectedcourse')
                ).order_by('-selection_count')[:limit]
            
            preferred_categories = list(
                selected.values_list('content_object__program__category', flat=True).distinct()
            )
            preferred_universities = list(
                selected.values_list('content_object__university', flat=True).distinct()
            )
            
            user_subjects = [
                {'subject_id': str(us.subject.id), 'grade': us.grade}
                for us in user.subjects.all()
            ]
            
            recommendations = CourseOffering.objects.filter(is_active=True).exclude(
                id__in=selected.values_list('object_id', flat=True)
            )
            
            recommendations = recommendations.filter(
                Q(program__category__in=preferred_categories) |
                Q(university__in=preferred_universities)
            ).distinct()
            
            if user_subjects:
                matched = self.match_courses(user_subjects)
                matched_ids = [o.id for o in matched[:limit * 2]]
                recommendations = recommendations.filter(id__in=matched_ids)
            
            return recommendations.annotate(
                avg_rating=Avg('reviews__rating', filter=Q(reviews__is_approved=True))
            ).order_by('-avg_rating', 'program__name')[:limit]
            
        except Exception as e:
            self.logger.error(f"Error getting recommendations: {str(e)}")
            return CourseOffering.objects.filter(is_active=True)[:limit]

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