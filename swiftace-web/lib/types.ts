export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'student' | 'instructor' | 'admin';
  created: string;
  updated: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  price: number;
  instructor: string; // User ID
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in minutes
  published: boolean;
  created: string;
  updated: string;
}

export interface Lesson {
  id: string;
  course: string; // Course ID
  title: string;
  description?: string;
  content: string; // HTML content
  video_url?: string;
  order: number;
  duration: number; // in minutes
  published: boolean;
  created: string;
  updated: string;
}

export interface Enrollment {
  id: string;
  user: string; // User ID
  course: string; // Course ID
  progress: number; // 0-100
  completed: boolean;
  enrolled_date: string;
  completed_date?: string;
}

export interface LessonProgress {
  id: string;
  user: string; // User ID
  lesson: string; // Lesson ID
  completed: boolean;
  completed_date?: string;
  time_spent: number; // in seconds
}