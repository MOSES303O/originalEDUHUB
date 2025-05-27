# backend/courses/management/commands/load_sample_data.py
from django.core.management.base import BaseCommand
from courses.models import Subject, Course, Career, Campus

class Command(BaseCommand):
    help = 'Loads sample data for the EduPathway application'

    def handle(self, *args, **kwargs):
        self.stdout.write('Loading sample data...')
        
        # Create subjects
        subjects_data = [
            {"value": "mathematics", "label": "Mathematics", "name": "Mathematics"},
            {"value": "kiswahili", "label": "Kiswahili", "name": "Kiswahili"},
            {"value": "english", "label": "English", "name": "English"},
            {"value": "biology", "label": "Biology", "name": "Biology"},
            {"value": "chemistry", "label": "Chemistry", "name": "Chemistry"},
            {"value": "physics", "label": "Physics", "name": "Physics"},
            {"value": "history", "label": "History", "name": "History"},
            {"value": "geography", "label": "Geography", "name": "Geography"},
            {"value": "business_studies", "label": "Business Studies", "name": "Business Studies"},
            {"value": "computer_studies", "label": "Computer Studies", "name": "Computer Studies"},
            {"value": "agriculture", "label": "Agriculture", "name": "Agriculture"},
        ]
        
        subjects = {}
        for subject_data in subjects_data:
            subject, created = Subject.objects.get_or_create(
                value=subject_data["value"],
                defaults={"label": subject_data["label"], "name": subject_data["name"]}
            )
            subjects[subject.value] = subject
            if created:
                self.stdout.write(f'Created subject: {subject.name}')
        
        # Create courses
        courses_data = [
            {
                "id": "CS001",
                "code": "BSC-CS-001",
                "title": "Bachelor of Computer Science",
                "university": "University of Nairobi",
                "description": "A comprehensive program covering programming, algorithms, data structures, and software engineering.",
                "full_description": "The Bachelor of Computer Science program at the University of Nairobi is designed to provide students with a strong foundation in computer science principles and practices.\n\nThis four-year program covers essential areas including:\n\n- Programming fundamentals and advanced techniques\n- Data structures and algorithms\n- Database systems and management\n- Software engineering methodologies\n- Computer networks and security\n- Artificial intelligence and machine learning\n- Web and mobile application development\n\nStudents will engage in practical projects, internships, and research opportunities to develop real-world skills that are highly sought after in the technology industry.\n\nGraduates of this program typically pursue careers as software developers, systems analysts, database administrators, network engineers, or continue to postgraduate studies in specialized areas of computer science.",
                "points": 32,
                "duration": "4 years",
                "start_date": "September 2024",
                "application_deadline": "June 30, 2024",
                "subjects": ["mathematics", "computer_studies", "physics"],
                "careers": ["Software Developer", "Systems Analyst", "Database Administrator", "Network Engineer", "IT Consultant", "Web Developer"],
                "campuses": ["Main Campus", "Kisumu Campus"]
            },
            {
                "id": "BA001",
                "code": "BBA-001",
                "title": "Bachelor of Business Administration",
                "university": "Strathmore University",
                "description": "Develop skills in management, marketing, finance, and entrepreneurship.",
                "full_description": "The Bachelor of Business Administration program at Strathmore University is a comprehensive business degree that prepares students for leadership roles in various business environments.\n\nThis four-year program covers key business disciplines including:\n\n- Management principles and organizational behavior\n- Marketing strategies and consumer behavior\n- Financial accounting and management\n- Economics and business analytics\n- Entrepreneurship and innovation\n- Business ethics and corporate social responsibility\n- Strategic management and leadership\n\nThe program incorporates case studies, industry projects, and internships to provide practical experience alongside theoretical knowledge.\n\nGraduates are equipped to pursue careers in corporate management, marketing, finance, consulting, or to start their own businesses.",
                "points": 28,
                "duration": "4 years",
                "start_date": "September 2024",
                "application_deadline": "July 15, 2024",
                "subjects": ["business_studies", "mathematics", "english"],
                "careers": ["Business Manager", "Marketing Executive", "Financial Analyst", "Human Resources Manager", "Management Consultant", "Entrepreneur"],
                "campuses": ["Main Campus"]
            },
            {
                "id": "MD001",
                "code": "MBChB-001",
                "title": "Bachelor of Medicine and Surgery",
                "university": "Kenyatta University",
                "description": "Train to become a medical doctor with a focus on clinical practice and medical sciences.",
                "full_description": "The Bachelor of Medicine and Bachelor of Surgery (MBChB) program at Kenyatta University is designed to train competent medical practitioners equipped with the knowledge, skills, and attitudes necessary for the practice of medicine.\n\nThis six-year program is structured to provide:\n\n- Strong foundation in basic medical sciences\n- Comprehensive clinical training in various medical specialties\n- Hands-on experience through hospital rotations and community health projects\n- Understanding of medical ethics and professional conduct\n- Research skills and evidence-based medical practice\n- Public health and preventive medicine knowledge\n\nThe program follows a rigorous curriculum that meets international standards and prepares students for medical licensure examinations.\n\nGraduates can pursue careers in clinical practice, medical research, public health, or specialize in various fields of medicine through postgraduate training.",
                "points": 42,
                "duration": "6 years",
                "start_date": "September 2024",
                "application_deadline": "May 31, 2024",
                "subjects": ["biology", "chemistry", "mathematics"],
                "careers": ["Medical Doctor", "Surgeon", "Medical Researcher", "Public Health Specialist", "Medical Administrator", "Medical Educator"],
                "campuses": ["Main Campus"]
            },
        ]
        
        for course_data in courses_data:
            course, created = Course.objects.get_or_create(
                id=course_data["id"],
                defaults={
                    "code": course_data["code"],
                    "title": course_data["title"],
                    "university": course_data["university"],
                    "description": course_data["description"],
                    "full_description": course_data["full_description"],
                    "points": course_data["points"],
                    "duration": course_data["duration"],
                    "start_date": course_data["start_date"],
                    "application_deadline": course_data["application_deadline"],
                }
            )
            
            if created:
                self.stdout.write(f'Created course: {course.title}')
                
                # Add subjects
                for subject_value in course_data["subjects"]:
                    course.subjects.add(subjects[subject_value])
                
                # Add careers
                for career_name in course_data["careers"]:
                    Career.objects.create(name=career_name, course=course)
                
                # Add campuses
                for campus_name in course_data["campuses"]:
                    Campus.objects.create(name=campus_name, course=course)
        
        self.stdout.write(self.style.SUCCESS('Successfully loaded sample data'))