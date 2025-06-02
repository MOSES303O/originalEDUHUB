from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from .models import University, Faculty, Department


class UniversityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.university = University.objects.create(
            name="University of Nairobi",
            code="UON",
            description="Kenya's premier university",
            city="Nairobi",
            country="Kenya",
            ranking=1
        )
        self.faculty = Faculty.objects.create(
            university=self.university,
            name="Faculty of Engineering"
        )
        self.department = Department.objects.create(
            faculty=self.faculty,
            name="Department of Computer Science"
        )

    def test_list_universities(self):
        """Test retrieving a list of universities"""
        url = reverse('university-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_university(self):
        """Test retrieving a specific university"""
        url = reverse('university-detail', kwargs={'slug': self.university.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'University of Nairobi')

    def test_university_faculties(self):
        """Test retrieving faculties for a university"""
        url = reverse('university-faculties', kwargs={'slug': self.university.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Faculty of Engineering')
