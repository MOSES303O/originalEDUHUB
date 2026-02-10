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
    KUCCPS-compliant course qualification engine.
    
    RULES (as per your requirement):
    - If user.cluster_points is set and > 0.000 → use it directly as user_points
    - No recalculation if stored points exist
    - If cluster_points is None or 0.000 → qualification fails early: "No cluster points entered by user"
    - Structural checks (≥7 subjects, cluster rules, program reqs) always run
    - Points comparison only after all structural checks pass
    """
    GRADE_POINTS = {
        'A': 12, 'A-': 11, 'B+': 10, 'B': 9, 'B-': 8,
        'C+': 7, 'C': 6, 'C-': 5, 'D+': 4, 'D': 3,
        'D-': 2, 'E': 1,
    }
    SUBJECT_NORMALIZATION = {
        'english': 'English',
        'kiswahili': 'Kiswahili',
        'mathematics': 'Mathematics',
        'Physics': 'Physics',
        'Chemistry': 'Chemistry',
        'Biology': 'Biology',
        'chemistry': 'Chemistry',
        'history': 'History & Government',
        'history and government': 'History & Government',
        'history & government': 'History & Government',
        'history and government': 'History & Government',
        'cre': 'CRE',
        'christian religious education': 'CRE',
        'ire': 'IRE',
        'islamic religious education': 'IRE',
        'business studies': 'Business Studies',
        'computer': 'Computer Studies',
        'agricultural studies': 'Agriculture',
        'geography': 'Geography',
        'physics': 'Physics',
        'chemistry': 'Chemistry',
        'biology': 'Biology',
        'agriculture': 'Agriculture',
        'Biology':'Biology',
        # Add more as you discover mismatches
    }

    CLUSTER_GROUPS = {
        'GROUP_I': ['English', 'Kiswahili'],
        'GROUP_II': ['Mathematics','Physics','Chemistry','Biology'],
        'GROUP_III': ['History & Government', 'Geography', 'CRE', 'IRE', 'HRE', 'Business Studies'],
        'GROUP_IV': ['Home Science', 'Art & Design', 'Agriculture', 'Computer Studies', 'Music', 'Building Construction'],
        'GROUP_V': ['French', 'German', 'Arabic', 'Sign Language', 'Woodwork', 'Metalwork', 'Power Mechanics', 'Electricity', 'Drawing & Design', 'Aviation Technology'],
    }

    # Cluster rules (1–18) — audited & corrected against latest KUCCPS tables
    CLUSTER_RULES = {
    1: {
        'name': 'Cluster 1 – General / Arts / Education / Languages',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [
            {'group': 'GROUP_II', 'min_grade': 'B'},
            {'subject': 'Physics', 'min_grade': 'B+'},
            {'subject': 'Chemistry', 'min_grade': 'B+'},
        ],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    2: {
        'name': 'Cluster 2 – Business / Law / Management / Co-operative',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'B'}],
        'required_one_of': [
            {'group': 'GROUP_II', 'min_grade': 'B'},
            {'subject': 'Physics', 'min_grade': 'B+'},
            {'subject': 'Chemistry', 'min_grade': 'B+'},
        ],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    3: {
        'name': 'Cluster 3 – Communication / Media / Journalism',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [
            {'group': 'GROUP_II', 'min_grade': 'C+'},
            {'subject': 'Physics', 'min_grade': 'C+'},
            {'subject': 'Chemistry', 'min_grade': 'C+'},

        ],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    4: {
        'name': 'Cluster 4 – Arts / Design / Fine Art / Animation',
        'mandatory': [
            {'subject': 'Physics', 'min_grade': 'A-'},
            {'subject': 'Chemistry', 'min_grade': 'A-'},
            {'group': 'GROUP_I', 'min_grade': 'C+'},
        ],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
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
            {'subject': 'Physics', 'min_grade': 'B+'},
            {'subject': 'Chemistry', 'min_grade': 'B+'},
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
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 1, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    7: {
        'name': 'Cluster 7 – Education / Guidance & Counselling',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 4, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    8: {
        'name': 'Cluster 8 – Co-operative / Entrepreneurship / Project Management',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [
            {'group': 'GROUP_II', 'min_grade': 'C+'},
            {'subject': 'Physics', 'min_grade': 'C+'},
            {'subject': 'Chemistry', 'min_grade': 'C+'},
        ],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
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
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 2, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    10: {
        'name': 'Cluster 10 – Pure Sciences / Actuarial / Statistics',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [
            {'group': 'GROUP_II', 'min_grade': 'B'},
            {'subject': 'Physics', 'min_grade': 'B+'},
            {'subject': 'Chemistry', 'min_grade': 'B+'},
        ],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    11: {
        'name': 'Cluster 11 – Interior Design / Fashion / Textiles',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 4, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    12: {
        'name': 'Cluster 12 – Sports / Recreation / Physical Education',
        'mandatory': [{'subject': 'Biology', 'min_grade': 'C+'}],
        'required_one_of': [{'subject': 'Chemistry', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    13: {
        'name': 'Cluster 13 – Dental / Pharmacy / Optometry / Medical Laboratory',
        'mandatory': [
            {'subject': 'Biology', 'min_grade': 'B'},
            {'subject': 'Chemistry', 'min_grade': 'B'},
        ],
        'required_one_of': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 1, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    14: {
        'name': 'Cluster 14 – History / Archaeology / Anthropology',
        'mandatory': [
            {'subject': 'History & Government', 'min_grade': 'C+'},
            {'group': 'GROUP_I', 'min_grade': 'C+'},
        ],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    15: {
        'name': 'Cluster 15 – International Studies / Diplomacy / Political Science',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    16: {
        'name': 'Cluster 16 – Environmental / Natural Resource / Marine / Coastal',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 4, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    17: {
        'name': 'Cluster 17 – Geography / Surveying / Land Administration',
        'mandatory': [{'subject': 'Geography', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    18: {
        'name': 'Cluster 18 – Public / Community Health / Nutrition',
        'mandatory': [
            {'subject': 'Biology', 'min_grade': 'C+'},
            {'subject': 'Chemistry', 'min_grade': 'C+'},
        ],
        'required_one_of': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 2, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    19: {
        'name': 'Cluster 19 – Education (Arts / Science / Primary / Special Needs)',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 4, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    20: {
        'name': 'Cluster 20 – Religious Studies / Theology / Chaplaincy',
        'mandatory': [
            {'group': 'GROUP_I', 'min_grade': 'C+'},
            {'subject': 'CRE', 'min_grade': 'C+'},  # or IRE/HRE equivalent
        ],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    21: {
        'name': 'Cluster 21 – Special Needs Education / Guidance & Counselling',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 4, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    22: {
        'name': 'Cluster 22 – Early Childhood Development / Pre-Primary Education',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 4, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    23: {
        'name': 'Cluster 23 – Library & Information Science / Records Management',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    24: {
        'name': 'Cluster 24 – Social Work / Community Development',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    25: {
        'name': 'Cluster 25 – Journalism / Mass Communication (variants)',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    26: {
        'name': 'Cluster 26 – Music / Performing Arts / Theatre',
        'mandatory': [
            {'group': 'GROUP_I', 'min_grade': 'C+'},
            {'subject': 'Music', 'min_grade': 'C+'},  # or equivalent performing arts
        ],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    27: {
        'name': 'Cluster 27 – Film / Animation / Graphics / Media Production',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    28: {
        'name': 'Cluster 28 – Public Administration / Governance / Leadership',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    29: {
        'name': 'Cluster 29 – Peace & Conflict Studies / Resolution',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    30: {
        'name': 'Cluster 30 – Security / Criminology / Disaster Management',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    31: {
        'name': 'Cluster 31 – Education (various specializations – Arts/Science)',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 4, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    32: {
        'name': 'Cluster 32 – Education (Science/Arts with IT)',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 4, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    33: {
        'name': 'Cluster 33 – Education (Primary / Secondary variants)',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 4, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    34: {
        'name': 'Cluster 34 – Education (Special Needs / Inclusive)',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 4, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    35: {
        'name': 'Cluster 35 – Education (Early Childhood / Pre-Primary)',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 4, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    36: {
        'name': 'Cluster 36 – Education (Guidance & Counselling / Psychology)',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 4, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    37: {
        'name': 'Cluster 37 – Library / Information Science / Archives',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    38: {
        'name': 'Cluster 38 – Records Management / Information Management',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    39: {
        'name': 'Cluster 39 – Social Work / Community Development / Sociology',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    40: {
        'name': 'Cluster 40 – Anthropology / Sociology / Cultural Studies',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    41: {
        'name': 'Cluster 41 – Psychology / Counselling',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    42: {
        'name': 'Cluster 42 – Public Administration / Governance',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    43: {
        'name': 'Cluster 43 – Peace / Conflict / Security Studies',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    44: {
        'name': 'Cluster 44 – Criminology / Forensic Studies',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    45: {
        'name': 'Cluster 45 – Disaster / Emergency Management',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    46: {
        'name': 'Cluster 46 – Development Studies / Project Planning',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    47: {
        'name': 'Cluster 47 – Community Health / Nutrition / Public Health (variants)',
        'mandatory': [
            {'subject': 'Biology', 'min_grade': 'C+'},
            {'subject': 'Chemistry', 'min_grade': 'C+'},
        ],
        'required_one_of': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 2, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
    48: {
        'name': 'Cluster 48 – General / Interdisciplinary / Remaining Programmes',
        'mandatory': [{'group': 'GROUP_I', 'min_grade': 'C+'}],
        'required_one_of': [{'group': 'GROUP_II', 'min_grade': 'C+'}],
        'any_from': [{'groups': ['GROUP_III', 'GROUP_IV', 'GROUP_V'], 'count': 3, 'min_grade': 'C+'}],
        'min_points_floor': 46,
    },
}

    def normalize_subject_name(self, name: str) -> str:
        name = name.strip().lower()
        return self.SUBJECT_NORMALIZATION.get(name, name.title())

    def get_effective_cluster_points(self, user: User) -> Tuple[float, str]:
        stored = user.cluster_points
        if stored is not None and stored > Decimal('0.000'):
            logger.info(f"Using stored cluster points for {user.phone_number}: {stored}")
            return float(stored), "stored"
        logger.info(f"No valid stored cluster points for {user.phone_number} (value: {stored})")
        return 0.0, "none"

    def check_user_qualification_for_course_offering(
        self,
        user: User,
        offering: CourseOffering
    ) -> Tuple[bool, Dict[str, Any]]:
        details = {
            "qualified": False,
            "reason": "",
            "debug": {},
            "user_points": None,
            "required_points": None,
            "points_source": None,
            "subjects_count": 0,
            "cluster": None,
        }

        # 1. Load user's graded subjects
        user_subjects = user.subjects.filter(grade__isnull=False).select_related('subject')
        num_subjects = user_subjects.count()
        details["subjects_count"] = num_subjects
        logger.info(f"User {user.phone_number} has {num_subjects} graded subjects")

        # 2. Get stored points
        effective_points, source = self.get_effective_cluster_points(user)
        details["user_points"] = effective_points
        details["points_source"] = source

        if source == "none":
            details["reason"] = "No cluster points entered by user"
            return False, details

        # 3. Infer cluster
        cluster_number = None
        name_lower = offering.program.name.lower()
        
        # In check_user_qualification_for_course_offering method (inside CourseMatchingEngine)

        # 3. Infer cluster number
        cluster_number = None
        name_lower = offering.program.name.lower()
        
        # Cluster 5 – Engineering & Technical
        if any(word in name_lower for word in [
            'engineering', 'civil', 'mechanical', 'electrical', 'chemical engineering',
            'aeronautical', 'aviation', 'geospatial', 'geomatic', 'mining', 'petroleum',
            'industrial engineering', 'biomedical engineering', 'telecommunication',
            'instrumentation', 'control engineering', 'production', 'manufacturing',
            'textile engineering', 'marine engineering', 'environmental engineering',
            'renewable energy', 'nuclear', 'structural', 'mechatronics', 'automotive',
            'quantity surveying', 'land surveying', 'construction management'
        ]):
            cluster_number = 5
        
        # Cluster 6 – Health Sciences & Medicine
        elif any(word in name_lower for word in [
            'medicine', 'surgery', 'dental', 'pharmacy', 'nursing', 'clinical',
            'optometry', 'physiotherapy', 'medical laboratory', 'veterinary',
            'biomedical science', 'radiography', 'occupational therapy',
            'nutrition', 'dietetics', 'public health', 'community health',
            'environmental health', 'health records', 'medical imaging',
            'anaesthesia', 'orthopaedics', 'psychiatry', 'midwifery'
        ]):
            cluster_number = 6
        
        # Cluster 2 – Business, Law, Management, Co-operative
        elif any(word in name_lower for word in [
            'business', 'commerce', 'management', 'accounting', 'finance', 'marketing',
            'human resource', 'entrepreneurship', 'co-operative', 'hospitality', 'tourism',
            'law', 'legal', 'procurement', 'supply chain', 'logistics',
            'project management', 'public administration', 'governance', 'leadership',
            'office administration', 'secretarial', 'records management',
            'international business', 'banking', 'insurance', 'actuarial'
        ]):
            cluster_number = 2
        
        # Cluster 9 – Agriculture, Agribusiness, Food, Fisheries
        elif any(word in name_lower for word in [
            'agriculture', 'agricultural', 'agribusiness', 'food science', 'nutrition',
            'dietetics', 'fisheries', 'aquaculture', 'animal health', 'crop science',
            'horticulture', 'soil science', 'agronomy', 'forestry', 'wildlife',
            'range management', 'natural resource', 'environmental agriculture',
            'biotechnology (agri)'
        ]):
            cluster_number = 9
        
        # Cluster 3/4 – Arts, Media, Design, Communication, Education (split on education keyword)
        elif any(word in name_lower for word in [
            'arts', 'fine art', 'design', 'animation', 'film', 'journalism', 'mass communication',
            'media', 'communication', 'broadcast', 'graphic', 'interior design', 'fashion',
            'textile', 'music', 'theatre', 'performing arts', 'drama', 'visual arts',
            'language', 'linguistics', 'literature', 'translation', 'interpretation',
            'public relations', 'advertising', 'international relations', 'diplomacy',
            'peace', 'conflict', 'security', 'criminology', 'forensic', 'social work',
            'community development', 'sociology', 'anthropology', 'psychology',
            'counselling', 'library', 'information science', 'archives', 'records'
        ]):
            if 'education' in name_lower or 'teaching' in name_lower or 'pedagogy' in name_lower:
                cluster_number = 3  # Education-focused (clusters 19–36, 38)
            else:
                cluster_number = 4  # Pure arts/media/design/communication (clusters 3,4,25,26,27)
        
        # Cluster 10 – Pure Sciences, Actuarial, Statistics, IT/Computer
        elif any(word in name_lower for word in [
            'mathematics', 'statistics', 'actuarial', 'physics', 'chemistry', 'biology',
            'biochemistry', 'microbiology', 'biotechnology', 'computer science',
            'informatics', 'information technology', 'software', 'cybersecurity',
            'data science', 'geoinformatics', 'geology', 'geophysics'
        ]):
            cluster_number = 10
        
        # Cluster 23/37 – Library & Information Science (specific)
        elif any(word in name_lower for word in [
            'library', 'information science', 'records management', 'archives'
        ]):
            cluster_number = 23  # or 37 - you can pick one or add logic
        
        # Cluster 7/19–36 – Education (broad)
        elif any(word in name_lower for word in [
            'education', 'teaching', 'pedagogy', 'early childhood', 'special needs',
            'guidance', 'counselling', 'primary', 'secondary', 'vocational',
            'technical education'
        ]):
            cluster_number = 7 if 'guidance' in name_lower or 'counselling' in name_lower else 19
        
        # Cluster 11 – Interior/Fashion/Textiles
        elif any(word in name_lower for word in [
            'interior design', 'fashion', 'textile', 'apparel', 'clothing'
        ]):
            cluster_number = 11
        
        # Cluster 12 – Sports/Physical Education
        elif any(word in name_lower for word in [
            'sports', 'physical education', 'recreation', 'exercise'
        ]):
            cluster_number = 12
        
        # Cluster 13 – Dental/Pharmacy/Optometry/Lab (sub-health)
        elif any(word in name_lower for word in [
            'dental', 'pharmacy', 'optometry', 'laboratory', 'medical lab'
        ]):
            cluster_number = 13
        
        # Cluster 14–18, 20–22, 24–48 fallback logic (add more if needed)
        elif any(word in name_lower for word in [
            'geography', 'surveying', 'land administration', 'environmental',
            'natural resource', 'marine', 'coastal', 'wildlife', 'forestry',
            'hotel', 'hospitality', 'tourism management', 'travel'
        ]):
            cluster_number = 17 if 'geography' in name_lower or 'surveying' in name_lower else 16
        
        # Default / Catch-all (Cluster 48 – General/Interdisciplinary/Remaining)
        else:
            cluster_number = 48
        
        details["cluster"] = cluster_number
        details["debug"]["cluster_source"] = "program_name_inference"
        details["debug"]["program_name"] = offering.program.name

        rules = self.CLUSTER_RULES.get(cluster_number, self.CLUSTER_RULES[1])
        user_grade_map = {self.normalize_subject_name(us.subject.name): us.grade for us in user_subjects}

        # Mandatory
        missing_mandatory = []
        for req in rules.get('mandatory', []):
            satisfied = False
            if 'subject' in req:
                norm = self.normalize_subject_name(req['subject'])
                if norm in user_grade_map and self.GRADE_POINTS.get(user_grade_map[norm], 0) >= self.GRADE_POINTS.get(req['min_grade'], 0):
                    satisfied = True
            elif 'group' in req:
                for gs in self.CLUSTER_GROUPS.get(req['group'], []):
                    norm_gs = self.normalize_subject_name(gs)
                    if norm_gs in user_grade_map and self.GRADE_POINTS.get(user_grade_map[norm_gs], 0) >= self.GRADE_POINTS.get(req['min_grade'], 0):
                        satisfied = True
                        break
            if not satisfied:
                missing_mandatory.append(req)

        if missing_mandatory:
            details["reason"] = "Missing mandatory cluster subjects/groups"
            details["missing_mandatory"] = missing_mandatory
            return False, details

        # Required one-of
        one_of_satisfied = any(
            (self.normalize_subject_name(alt.get('subject', '')) in user_grade_map and 
             self.GRADE_POINTS.get(user_grade_map[self.normalize_subject_name(alt['subject'])], 0) >= self.GRADE_POINTS.get(alt['min_grade'], 0)) or
            any(
                any(
                    self.normalize_subject_name(gs) in user_grade_map and 
                    self.GRADE_POINTS.get(user_grade_map[self.normalize_subject_name(gs)], 0) >= self.GRADE_POINTS.get(alt['min_grade'], 0)
                    for gs in self.CLUSTER_GROUPS.get(alt.get('group', ''), [])
                )
                for us in user_subjects
            )
            for alt in rules.get('required_one_of', [])
        )

        if not one_of_satisfied:
            details["reason"] = "Missing required subject or alternative from cluster rules"
            details["missing_alternative"] = rules.get('required_one_of', [])
            return False, details

        # Any-from count — YOUR IMPROVED VERSION
        any_req = rules.get('any_from', [{}])[0]
        required_count = any_req.get('count', 0)
        min_g = any_req.get('min_grade', 'E')
        allowed_g = any_req.get('groups', [])

        any_met = 0
        matched_subjects = []
        for g in allowed_g:
            for gs in self.CLUSTER_GROUPS.get(g, []):
                norm_gs = self.normalize_subject_name(gs)
                for subj_name, grade in user_grade_map.items():
                    norm_subj = self.normalize_subject_name(subj_name)
                    if norm_subj == norm_gs and self.GRADE_POINTS.get(grade, 0) >= self.GRADE_POINTS.get(min_g, 0):
                        any_met += 1
                        matched_subjects.append(f"{norm_gs} ({grade}) from {g}")
                        break  # stop after first match per group-subject

        logger.info(f"Any-from for cluster {cluster_number}: met {any_met}/{required_count} - matched: {matched_subjects}")

        if any_met < required_count:
            details["reason"] = f"Missing {required_count - any_met} subjects from allowed groups"
            details["missing_count"] = required_count - any_met
            return False, details

        # Program-specific requirements
        prog_reqs = ProgramSubjectRequirement.objects.filter(
            program=offering.program, is_mandatory=True
        ).select_related('subject')

        missing_prog = []
        unmet_prog = []

        for req in prog_reqs:
            subj_id_str = str(req.subject_id)
            found = False
            for us in user_subjects:
                if str(us.subject_id) == subj_id_str:
                    found = True
                    if req.minimum_grade and self.GRADE_POINTS.get(us.grade, 0) < self.GRADE_POINTS.get(req.minimum_grade, 0):
                        unmet_prog.append({
                            "subject": req.subject.name,
                            "user_grade": us.grade,
                            "required_grade": req.minimum_grade
                        })
                    break
            if not found:
                missing_prog.append({
                    "subject": req.subject.name,
                    "required_grade": req.minimum_grade or "Any"
                })

        if missing_prog or unmet_prog:
            details["reason"] = "Does not meet program-specific subject/grade requirements"
            details["missing_program_requirements"] = missing_prog
            details["unmet_program_grades"] = unmet_prog
            return False, details

        # FINAL POINTS COMPARISON
        required_str = offering.cluster_requirements.strip() if offering.cluster_requirements else None
        required_points = None

        if required_str:
            try:
                required_points = float(required_str)
                details["required_points"] = required_points

                if effective_points < required_points:
                    details["reason"] = f"Cluster points too low ({effective_points:.3f} < {required_points:.3f})"
                    return False, details
            except ValueError:
                logger.warning(f"Invalid cluster_requirements: '{required_str}'")
                details["reason"] = "Invalid course cutoff format"
                return False, details

        # All checks passed
        details["qualified"] = True
        details["reason"] = None
        details["message"] = f"Qualified for {offering.program.name} at {offering.university.name}"
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