# backend/utils/pdf_generator.py
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle

def generate_pdf(courses, user_name="Student"):
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Add title
    p.setFont("Helvetica-Bold", 20)
    p.setFillColor(colors.green)
    p.drawString(72, height - 72, "EduPathway - Selected Courses")
    
    # Add subtitle with date
    p.setFont("Helvetica", 12)
    p.setFillColor(colors.darkgrey)
    from datetime import date
    today = date.today().strftime("%B %d, %Y")
    p.drawString(72, height - 100, f"Generated for: {user_name} | Date: {today}")
    
    # Add description
    p.setFont("Helvetica", 10)
    p.drawString(72, height - 120, 
                "This document contains your selected university courses based on your academic profile and interests.")
    
    # Create table data
    data = [["Course Code", "Title", "University", "Points"]]
    for course in courses:
        data.append([course.code, course.title, course.university, str(course.points)])
    
    # Create table
    table = Table(data, colWidths=[80, 200, 150, 50])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.green),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    # Draw table
    table.wrapOn(p, width - 144, height)
    table.drawOn(p, 72, height - 200)
    
    # Add course details
    y_position = height - 250
    p.setFont("Helvetica-Bold", 14)
    p.setFillColor(colors.green)
    p.drawString(72, y_position, "Course Details")
    
    y_position -= 30
    
    for i, course in enumerate(courses):
        if y_position < 100:  # Check if we need a new page
            p.showPage()
            y_position = height - 72
        
        p.setFont("Helvetica-Bold", 12)
        p.setFillColor(colors.black)
        p.drawString(72, y_position, f"{i+1}. {course.title} ({course.code})")
        
        y_position -= 20
        p.setFont("Helvetica", 10)
        p.drawString(90, y_position, f"University: {course.university}")
        
        y_position -= 15
        p.drawString(90, y_position, f"Required Points: {course.points}")
        
        y_position -= 15
        p.drawString(90, y_position, f"Duration: {course.duration}")
        
        y_position -= 15
        p.drawString(90, y_position, f"Start Date: {course.start_date}")
        
        y_position -= 15
        p.drawString(90, y_position, f"Application Deadline: {course.application_deadline}")
        
        y_position -= 30
    
    # Add footer
    p.setFont("Helvetica", 8)
    p.setFillColor(colors.grey)
    p.drawString(72, 40, "EduPathway - Find your perfect university course | www.edupathway.com")
    p.drawString(width - 150, 40, f"Page 1 of 1")
    
    p.showPage()
    p.save()
    
    pdf = buffer.getvalue()
    buffer.close()
    return pdf