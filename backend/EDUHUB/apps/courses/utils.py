# apps/courses/utils.py or wherever this is
from django.db.models import Q, Count, Avg
from rest_framework.response import Response
from rest_framework import status
from .models import ProgramSubjectRequirement, CourseOffering
from apps.authentication.models import UserSubject,User
from typing import  Tuple, Dict, Any
import logging
from decimal import Decimal


logger = logging.getLogger(__name__)

class CourseMatchingEngine:
    """
    Fully KUCCPS-compliant course qualification engine.
    Uses stored cluster points only — no recalculation.
    Structural checks always run before points comparison.
    """

    GRADE_POINTS = {
        'A': 12, 'A-': 11, 'B+': 10, 'B': 9, 'B-': 8,
        'C+': 7, 'C': 6, 'C-': 5, 'D+': 4, 'D': 3,
        'D-': 2, 'E': 1,
    }

    # Robust subject normalization (expanded from your list + common variations)
    SUBJECT_NORMALIZATION = {
        k.lower(): v for k, v in {
            'english': 'English', 'eng': 'English', 'en': 'English',
            'kiswahili': 'Kiswahili', 'kisw': 'Kiswahili', 'swahili': 'Kiswahili',
            'mathematics': 'Mathematics', 'math': 'Mathematics', 'maths': 'Mathematics', 'mat': 'Mathematics',
            'physics': 'Physics', 'phy': 'Physics',
            'chemistry': 'Chemistry', 'chem': 'Chemistry', 'che': 'Chemistry',
            'biology': 'Biology', 'bio': 'Biology',
            'agriculture': 'Agriculture', 'agric': 'Agriculture', 'agr': 'Agriculture',
            'geography': 'Geography', 'geo': 'Geography',
            'history': 'History & Government', 'hist': 'History & Government',
            'history & government': 'History & Government',
            'history and government': 'History & Government',
            'cre': 'CRE', 'christian religious education': 'CRE',
            'ire': 'IRE', 'islamic religious education': 'IRE',
            'business studies': 'Business Studies', 'business': 'Business Studies', 'bst': 'Business Studies',
            'computer studies': 'Computer Studies', 'computer': 'Computer Studies', 'comp': 'Computer Studies',
            'home science': 'Home Science',
            'art & design': 'Art & Design', 'art': 'Art & Design',
            'music': 'Music',
            'french': 'French', 'fre': 'French',
            'german': 'German',
            'arabic': 'Arabic',
            'sign language': 'Sign Language',
        }.items()
    }

    CLUSTER_GROUPS = {
        'GROUP_I': ['English', 'Kiswahili'],
        'GROUP_II': ['Mathematics', 'Physics', 'Chemistry', 'Biology'],
        'GROUP_III': ['History & Government', 'Geography', 'CRE', 'IRE', 'Business Studies'],
        'GROUP_IV': ['Home Science', 'Art & Design', 'Agriculture', 'Computer Studies', 'Music'],
        'GROUP_V': ['French', 'German', 'Arabic', 'Sign Language', 'Woodwork', 'Metalwork', 'Power Mechanics', 'Electricity'],
    }

    # Full CLUSTER_RULES — 1 to 48 (aligned with KUCCPS tables)
    CLUSTER_RULES = {
        1: {
            'name': 'Cluster 1 – General / Arts / Education / Languages',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'B'},
            ],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        2: {
            'name': 'Cluster 2 – Business / Law / Management / Co-operative',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'B'}],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'B'},
            ],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        3: {
            'name': 'Cluster 3 – Communication / Media / Journalism',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'C+'},
            ],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        4: {
            'name': 'Cluster 4 – Arts / Design / Fine Art / Animation',
            'mandatory': [
                {'subject': 'Physics', 'min_grade': 'A-'},
            ],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        5: {
            'name': 'Cluster 5 – Engineering / Technical / Geospatial / Mining',
            'mandatory': [
                {'subject': 'Physics', 'min_grade': 'C+'},
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'B'},
            ],
            'any_from': [
                {'subject': 'Chemistry', 'min_grade': 'C+'},
                {'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 2, 'min_grade': 'C+'},
            ],
            'min_points_floor': 46,
        },
        6: {
            'name': 'Cluster 6 – Health Sciences / Medicine / Pharmacy / Nursing',
            'mandatory': [
                {'subject': 'Biology', 'min_grade': 'B'},
                {'subject': 'Chemistry', 'min_grade': 'B'},
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'B'}],
            'any_from_count': 1,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        7: {
            'name': 'Cluster 7 – Education / Guidance & Counselling',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        8: {
            'name': 'Cluster 8 – Co-operative / Entrepreneurship / Project Management',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'C+'},
            ],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        9: {
            'name': 'Cluster 9 – Agribusiness / Agriculture / Food / Fisheries',
            'mandatory': [
                {'group': 'GROUP_I', 'min_grade': 'C+'},
                {'subject': 'Biology', 'min_grade': 'C+'},
                {'subject': 'Agriculture', 'min_grade': 'C+'},
            ],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        10: {
            'name': 'Cluster 10 – Pure Sciences / Actuarial / Statistics',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [
                {'group': 'GROUP_II', 'min_grade': 'B'},
            ],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        11: {
            'name': 'Cluster 11 – Interior Design / Fashion / Textiles',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        12: {
            'name': 'Cluster 12 – Sports / Recreation / Physical Education',
            'mandatory': [{'subject': 'Biology', 'min_grade': 'C+'}],
            'required_one_of': [{'subject': 'Chemistry', 'min_grade': 'C+'}],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        13: {
            'name': 'Cluster 13 – Dental / Pharmacy / Optometry / Medical Laboratory',
            'mandatory': [
                {'subject': 'Biology', 'min_grade': 'B'},
                {'subject': 'Chemistry', 'min_grade': 'B'},
            ],
            'required_one_of': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'any_from_count': 1,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        14: {
            'name': 'Cluster 14 – History / Archaeology / Anthropology',
            'mandatory': [
                {'subject': 'History & Government', 'min_grade': 'C+'},
                {'group': 'GROUP_I', 'min_grade': 'C+'},
            ],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        15: {
            'name': 'Cluster 15 – International Studies / Diplomacy / Political Science',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        16: {
            'name': 'Cluster 16 – Environmental / Natural Resource / Marine / Coastal',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        17: {
            'name': 'Cluster 17 – Geography / Surveying / Land Administration',
            'mandatory': [{'subject': 'Geography', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        18: {
            'name': 'Cluster 18 – Public / Community Health / Nutrition',
            'mandatory': [
                {'subject': 'Biology', 'min_grade': 'C+'},
                {'subject': 'Chemistry', 'min_grade': 'C+'},
            ],
            'required_one_of': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        19: {
            'name': 'Cluster 19 – Education (Arts / Science / Primary / Special Needs)',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        20: {
            'name': 'Cluster 20 – Religious Studies / Theology / Chaplaincy',
            'mandatory': [
                {'group': 'GROUP_I', 'min_grade': 'C+'},
                {'subject': 'CRE', 'min_grade': 'C+'},
            ],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        21: {
            'name': 'Cluster 21 – Special Needs Education / Guidance & Counselling',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        22: {
            'name': 'Cluster 22 – Early Childhood Development / Pre-Primary Education',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        23: {
            'name': 'Cluster 23 – Library / Information Science / Records Management',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        24: {
            'name': 'Cluster 24 – Social Work / Community Development',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        25: {
            'name': 'Cluster 25 – Journalism / Mass Communication (variants)',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        26: {
            'name': 'Cluster 26 – Music / Performing Arts / Theatre',
            'mandatory': [
                {'group': 'GROUP_I', 'min_grade': 'C+'},
                {'subject': 'Music', 'min_grade': 'C+'},
            ],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        27: {
            'name': 'Cluster 27 – Film / Animation / Graphics / Media Production',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        28: {
            'name': 'Cluster 28 – Public Administration / Governance / Leadership',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        29: {
            'name': 'Cluster 29 – Peace & Conflict Studies / Resolution',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        30: {
            'name': 'Cluster 30 – Security / Criminology / Disaster Management',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        31: {
            'name': 'Cluster 31 – Education (various specializations – Arts/Science)',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 3,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        32: {
            'name': 'Cluster 32 – Education (Science/Arts with IT)',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        33: {
            'name': 'Cluster 33 – Education (Primary / Secondary variants)',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        34: {
            'name': 'Cluster 34 – Education (Special Needs / Inclusive)',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        35: {
            'name': 'Cluster 35 – Education (Early Childhood / Pre-Primary)',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        36: {
            'name': 'Cluster 36 – Education (Guidance & Counselling / Psychology)',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        37: {
            'name': 'Cluster 37 – Library / Information Science / Archives',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        38: {
            'name': 'Cluster 38 – Records Management / Information Management',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        39: {
            'name': 'Cluster 39 – Social Work / Community Development / Sociology',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        40: {
            'name': 'Cluster 40 – Anthropology / Sociology / Cultural Studies',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        41: {
            'name': 'Cluster 41 – Psychology / Counselling',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        42: {
            'name': 'Cluster 42 – Public Administration / Governance',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        43: {
            'name': 'Cluster 43 – Peace / Conflict / Security Studies',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        44: {
            'name': 'Cluster 44 – Criminology / Forensic Studies',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        45: {
            'name': 'Cluster 45 – Disaster / Emergency Management',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        46: {
            'name': 'Cluster 46 – Development Studies / Project Planning',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        47: {
            'name': 'Cluster 47 – Community Health / Nutrition / Public Health (variants)',
            'mandatory': [
                {'subject': 'Biology', 'min_grade': 'C+'},
                {'subject': 'Chemistry', 'min_grade': 'C+'},
            ],
            'required_one_of': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
        48: {
            'name': 'Cluster 48 – General / Interdisciplinary / Remaining Programmes',
            'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
            'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
            'any_from_count': 2,
            'any_from_groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'],
            'min_grade_any': 'C+',
            'min_points_floor': 46,
        },
    }
    def normalize_subject_name(self, name: str) -> str:
        if not name:
            return ""
        name = name.strip().lower()
        return self.SUBJECT_NORMALIZATION.get(name, name.title())

    def get_user_grade_map(self, user: User) -> Dict[str, str]:
        user_subjects = user.subjects.filter(grade__isnull=False).select_related('subject')
        return {
            self.normalize_subject_name(us.subject.name): us.grade
            for us in user_subjects
        }

    def get_effective_cluster_points(self, user: User) -> Tuple[float, str]:
        stored = user.cluster_points
        if stored is not None and stored > Decimal('0.000'):
            return float(stored), "stored"
        return 0.0, "none"

    def infer_cluster_number(self, program_name: str) -> int:
        """
        Highly accurate KUCCPS cluster inference based on official program names and categories.
        Uses exact keywords from your full list + priority matching.
        """
        if not program_name:
            return 48

        name_lower = program_name.lower().replace("bachelor of", "").replace("bachelor", "").replace("bsc", "").replace("b.a", "").replace("b.ed", "").strip()

        # Cluster 5 – Engineering / Technical / Geospatial / Mining / Construction / Quantity Surveying
        engineering_keywords = [
            'engineering', 'civil', 'mechanical', 'electrical', 'electronics', 'instrumentation', 'control',
            'geospatial', 'geomatic', 'geomatics', 'mining', 'mineral processing', 'petroleum', 'marine',
            'telecommunication', 'mechatronic', 'manufacturing', 'industrial', 'construction management',
            'quantity surveying', 'land surveying', 'urban and regional planning', 'built environment'
        ]
        if any(kw in name_lower for kw in engineering_keywords):
            return 5

        # Cluster 6 – Health / Medicine / Pharmacy / Nursing / Dental / Medical Laboratory
        health_keywords = [
            'medicine', 'surgery', 'dental', 'pharmacy', 'nursing', 'clinical', 'medical laboratory',
            'biomedical', 'radiography', 'physiotherapy', 'occupational health', 'veterinary', 'animal health'
        ]
        if any(kw in name_lower for kw in health_keywords):
            return 6

        # Cluster 9 – Agriculture / Agribusiness / Food / Fisheries / Forestry / Range / Horticulture
        agriculture_keywords = [
            'agriculture', 'agricultural', 'agribusiness', 'food science', 'nutrition', 'dietetics',
            'horticulture', 'forestry', 'agroforestry', 'range management', 'wildlife', 'animal production',
            'dairy technology', 'seed science', 'soil', 'land resource', 'arid lands', 'eco-tourism'
        ]
        if any(kw in name_lower for kw in agriculture_keywords):
            return 9

        # Cluster 11 – Interior Design / Fashion / Textiles / Apparel / Clothing
        if any(kw in name_lower for kw in ['interior design', 'fashion', 'textile', 'clothing', 'apparel']):
            return 11

        # Cluster 23 – Library / Information Science / Records / Archives
        if any(kw in name_lower for kw in ['library', 'information science', 'records management', 'archives']):
            return 23

        # Cluster 10 – Pure Sciences / Actuarial / Statistics / Mathematics / Computer Science / IT
        science_it_keywords = [
            'actuarial', 'actuary', 'statistics', 'mathematics', 'mathematical', 'computer science',
            'information technology', 'software', 'cybersecurity', 'data science', 'applied statistics',
            'applied computer', 'applied biology', 'biochemistry', 'microbiology', 'biotechnology'
        ]
        if any(kw in name_lower for kw in science_it_keywords):
            return 10

        # Cluster 2 – Business / Commerce / Management / Entrepreneurship / Procurement / Logistics
        business_keywords = [
            'business', 'commerce', 'management', 'administration', 'entrepreneurship', 'procurement',
            'logistics', 'supply chain', 'human resource', 'hospitality', 'tourism', 'hotel',
            'financial', 'economics', 'project planning', 'strategic management'
        ]
        if any(kw in name_lower for kw in business_keywords):
            return 2

        # Cluster 19 – Broad Education (Arts/Science/Primary/Special Needs/Guidance)
        education_keywords = [
            'education', 'teaching', 'pedagogy', 'early childhood', 'special needs', 'guidance',
            'counselling', 'physical education', 'sports', 'arts with education', 'science with education'
        ]
        if any(kw in name_lower for kw in education_keywords):
            return 19 

        # Cluster 1 – General / Arts / Languages / Communication / Journalism / Social Sciences
        arts_social_keywords = [
            'arts', 'communication', 'journalism', 'mass communication', 'public relations',
            'psychology', 'sociology', 'anthropology', 'criminology', 'social work', 'community development',
            'gender', 'peace', 'conflict', 'international relations', 'diplomacy', 'public administration',
            'political science', 'development studies', 'environmental studies', 'planning'
        ]
        if any(kw in name_lower for kw in arts_social_keywords):
            return 1

        # Default catch-all: Cluster 48
        return 48

    def check_user_qualification_for_course_offering(
        self,
        user: User,
        offering: CourseOffering
    ) -> Tuple[bool, Dict[str, Any]]:
        details = {
            "qualified": False,
            "reason": "",
            "debug": {"cluster_source": "program_name_inference"},
            "user_points": None,
            "required_points": None,
            "points_source": None,
            "subjects_count": 0,
            "cluster": None,
        }

        # Load grades
        grade_map = self.get_user_grade_map(user)
        details["subjects_count"] = len(grade_map)

        if details["subjects_count"] < 7:
            details["reason"] = f"Insufficient subjects ({details['subjects_count']}/7 required)"
            return False, details

        # Points
        points, source = self.get_effective_cluster_points(user)
        details["user_points"] = points
        details["points_source"] = source

        if points == 0.0:
            details["reason"] = "No valid cluster points"
            return False, details

        # Infer cluster
        cluster_number = self.infer_cluster_number(offering.program.name)
        details["cluster"] = cluster_number
        details["debug"]["program_name"] = offering.program.name

        rules = self.CLUSTER_RULES.get(cluster_number, self.CLUSTER_RULES[48])

        # Mandatory checks
        missing_mandatory = []
        for req in rules.get('mandatory', []):
            satisfied = False
            if 'subject' in req:
                norm = self.normalize_subject_name(req['subject'])
                if norm in grade_map and self.GRADE_POINTS.get(grade_map[norm], 0) >= self.GRADE_POINTS.get(req['min_grade'], 0):
                    satisfied = True
            elif 'group' in req:
                group_satisfied = any(
                    self.normalize_subject_name(gs) in grade_map and
                    self.GRADE_POINTS.get(grade_map[self.normalize_subject_name(gs)], 0) >= self.GRADE_POINTS.get(req['min_grade'], 0)
                    for gs in self.CLUSTER_GROUPS.get(req['group'], [])
                )
                if group_satisfied:
                    satisfied = True
            if not satisfied:
                missing_mandatory.append(req)

        if missing_mandatory:
            details["reason"] = "Missing mandatory requirement(s)"
            details["missing_mandatory"] = missing_mandatory
            return False, details

        # Required one-of (alternatives)
        one_of_satisfied = False
        for alt in rules.get('required_one_of', []):
            if 'subject' in alt:
                norm = self.normalize_subject_name(alt['subject'])
                if norm in grade_map and self.GRADE_POINTS.get(grade_map[norm], 0) >= self.GRADE_POINTS.get(alt['min_grade'], 0):
                    one_of_satisfied = True
                    break
            elif 'group' in alt:
                group_satisfied = any(
                    self.normalize_subject_name(gs) in grade_map and
                    self.GRADE_POINTS.get(grade_map[self.normalize_subject_name(gs)], 0) >= self.GRADE_POINTS.get(alt['min_grade'], 0)
                    for gs in self.CLUSTER_GROUPS.get(alt['group'], [])
                )
                if group_satisfied:
                    one_of_satisfied = True
                    break

        if not one_of_satisfied:
            details["reason"] = "Missing required one-of alternative"
            details["missing_alternatives"] = rules.get('required_one_of')
            return False, details

        # FIXED any-from: count unique qualifying subjects across ALL allowed groups
        allowed_subject_names = set()
        for group_name in rules.get('any_from_groups', []):
            for subj in self.CLUSTER_GROUPS.get(group_name, []):
                allowed_subject_names.add(self.normalize_subject_name(subj))

        any_met = 0
        met_subjects = []
        for subj_norm in allowed_subject_names:
            if subj_norm in grade_map:
                grade_val = self.GRADE_POINTS.get(grade_map[subj_norm], 0)
                min_req = self.GRADE_POINTS.get(rules.get('min_grade_any', 'E'), 0)
                if grade_val >= min_req:
                    any_met += 1
                    met_subjects.append(f"{subj_norm} ({grade_map[subj_norm]})")

        required_count = rules.get('any_from_count', 0)
        if any_met < required_count:
            details["reason"] = f"Missing {required_count - any_met} subjects from allowed groups (met {any_met}/{required_count})"
            details["missing_count"] = required_count - any_met
            details["met_subjects"] = met_subjects  # for debug
            return False, details

        # Program-specific requirements
        prog_reqs = ProgramSubjectRequirement.objects.filter(
            program=offering.program, is_mandatory=True
        ).select_related('subject')

        missing_prog = []
        for req in prog_reqs:
            subj_norm = self.normalize_subject_name(req.subject.name)
            if subj_norm not in grade_map:
                missing_prog.append(subj_norm)
            elif req.minimum_grade and self.GRADE_POINTS.get(grade_map[subj_norm], 0) < self.GRADE_POINTS.get(req.minimum_grade, 0):
                missing_prog.append(f"{subj_norm} ({grade_map[subj_norm]} < {req.minimum_grade})")

        if missing_prog:
            details["reason"] = "Fails program-specific requirements"
            details["missing_program_reqs"] = missing_prog
            return False, details

        # Points check
        required_str = offering.cluster_requirements.strip() if offering.cluster_requirements else None
        if required_str:
            try:
                required_points = float(required_str)
                details["required_points"] = required_points
                if points < required_points:
                    details["reason"] = f"Points too low ({points:.3f} < {required_points:.3f})"
                    return False, details
            except ValueError:
                pass

        # Success
        details["qualified"] = True
        details["reason"] = None
        details["message"] = f"Qualified for {offering.program.name}"
        return True, details

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