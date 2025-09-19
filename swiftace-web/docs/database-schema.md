# SwiftAce Database Schema

This document outlines the PocketBase collections and their fields for the SwiftAce platform.

## Collections

### users (extends PocketBase auth collection)
- `name` (text, required)
- `avatar` (file, optional)
- `role` (select: student, instructor, admin, default: student)

### courses
- `title` (text, required)
- `description` (editor, required)
- `thumbnail` (file, optional)
- `price` (number, default: 0)
- `instructor` (relation to users, required)
- `category` (text, required)
- `level` (select: beginner, intermediate, advanced, required)
- `duration` (number, default: 0) - total course duration in minutes
- `published` (bool, default: false)

### lessons
- `course` (relation to courses, required)
- `title` (text, required)
- `description` (text, optional)
- `content` (editor, required)
- `video_url` (url, optional)
- `order` (number, required)
- `duration` (number, default: 0) - lesson duration in minutes
- `published` (bool, default: false)

### enrollments
- `user` (relation to users, required)
- `course` (relation to courses, required)
- `progress` (number, default: 0, min: 0, max: 100)
- `completed` (bool, default: false)
- `enrolled_date` (date, auto-filled on create)
- `completed_date` (date, optional)

### lesson_progress
- `user` (relation to users, required)
- `lesson` (relation to lessons, required)
- `completed` (bool, default: false)
- `completed_date` (date, optional)
- `time_spent` (number, default: 0) - time in seconds

## Indexes
- courses: instructor, category, published
- lessons: course, order
- enrollments: user, course
- lesson_progress: user, lesson