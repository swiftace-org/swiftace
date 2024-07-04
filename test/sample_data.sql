-- Clear the users, user_emails, and admins tables
DELETE FROM users;
DELETE FROM user_emails;
DELETE FROM admins;

-- Insert a user "Aakash N S" with the specified email and ID
INSERT INTO users (id, first_name, last_name) VALUES (1, 'Aakash', 'N S');

-- Insert the email for the user
INSERT INTO user_emails (email, user_id) VALUES ('aakashns.sky@gmail.com', 1);

-- Make the user an admin
INSERT INTO admins (user_id) VALUES (1);

DELETE FROM courses;

INSERT INTO courses
(slug, title, overview, description, cover_url, promo_video_url, additional_info, sort_order, privacy)
VALUES
('intro-to-python', 'Introduction to Python', 'Learn the basics of Python.', 'This course covers Python fundamentals.', 'http://example.com/python.jpg', 'http://example.com/python.mp4', 'Includes exercises and projects.', 1, 'PUBLIC');

INSERT INTO courses
(slug, title, overview, description, cover_url, promo_video_url, additional_info, sort_order, privacy)
VALUES
('web-development', 'Web Development', 'Web development from scratch.', 'Learn HTML, CSS, JavaScript, and more.', 'http://example.com/webdev.jpg', 'http://example.com/webdev.mp4', 'Course for beginners and intermediate.', 2, 'PRIVATE');

INSERT INTO courses
(slug, title, overview, description, cover_url, promo_video_url, additional_info, sort_order, privacy)
VALUES
('data-science', 'Data Science 101', 'Introduction to data science.', 'Covers data analysis, visualization.', 'http://example.com/datasci.jpg', 'http://example.com/datasci.mp4', 'Data projects included.', 3, 'UNLISTED');

INSERT INTO courses
(slug, title, overview, description, cover_url, promo_video_url, additional_info, sort_order, privacy)
VALUES
('machine-learning', 'Machine Learning Basics', 'Basics of ML algorithms.', 'Understand ML principles and techniques.', 'http://example.com/ml.jpg', 'http://example.com/ml.mp4', 'TensorFlow and PyTorch examples.', 4, 'PRIVATE');

INSERT INTO courses
(slug, title, overview, description, cover_url, promo_video_url, additional_info, sort_order, privacy)
VALUES
('digital-marketing', 'Digital Marketing Fundamentals', 'Essentials of digital marketing.', 'Learn about SEO, SEM, and social media marketing...', 'http://example.com/dm.jpg', 'http://example.com/dm.mp4', 'Tools and strategies for effective marketing.', 5, 'PUBLIC');