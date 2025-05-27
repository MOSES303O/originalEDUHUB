# backend/courses/models.py
from django.db import models

class Subject(models.Model):
    name = models.CharField(max_length=100)
    value = models.CharField(max_length=100, unique=True)
    label = models.CharField(max_length=100)
    
    def __str__(self):
        return self.name

class Course(models.Model):
    id = models.CharField(max_length=10, primary_key=True)
    code = models.CharField(max_length=20)
    title = models.CharField(max_length=200)
    university = models.CharField(max_length=100)
    description = models.TextField()
    full_description = models.TextField()
    points = models.IntegerField()
    duration = models.CharField(max_length=50)
    start_date = models.CharField(max_length=50)
    application_deadline = models.CharField(max_length=50)
    subjects = models.ManyToManyField(Subject, related_name='courses')
    
    def __str__(self):
        return f"{self.title} ({self.code})"
    
    class Meta:
        ordering = ['title']

class Career(models.Model):
    name = models.CharField(max_length=100)
    course = models.ForeignKey(Course, related_name='careers', on_delete=models.CASCADE)
    
    def __str__(self):
        return self.name

class Campus(models.Model):
    name = models.CharField(max_length=100)
    course = models.ForeignKey(Course, related_name='campuses', on_delete=models.CASCADE)
    
    def __str__(self):
        return self.name