import { assert, undefinedOrNull } from "lib/assertion";
import jsx from "lib/jsx";

/** TODO:
 * - [ ] Add JSDoc string
 * - [ ] Add check for valid unix timestamp
 */

export function CourseCard({ course }) {
  const tag = "CourseCard";

  assert({
    tag,
    check: course && typeof course === "object",
    error: "'course' must be an object",
    data: { course },
  });

  assert({
    tag,
    check: typeof course.slug === "string",
    error: "'course.slug' must be a string",
    data: { course },
  });

  assert({
    tag,
    check: typeof course.cover_url === "string",
    error: "'course.cover_url' must be a string",
    data: { course },
  });

  assert({
    tag,
    check: typeof course.title === "string",
    error: "'course.title' must be a string",
    data: { course },
  });

  assert({
    tag,
    check: typeof course.overview === "string",
    error: "'course.overview' must be a string",
    data: { course },
  });

  assert({
    tag,
    check: undefinedOrNull(course.total_lessons) || typeof course.total_lessons === "number",
    error: "'course.total_lessons' must be a number or undefined/null",
    data: { course },
  });

  assert({
    tag,
    check: undefinedOrNull(course.total_assignments) || typeof course.total_assignments === "number",
    error: "'course.total_assignments' must be a number or undefined/null",
    data: { course },
  });

  assert({
    tag,
    check: undefinedOrNull(course.certificate_slug) || typeof course.certificate_slug === "string",
    error: "'course.certificate_slug' must be a string or undefined/null",
    data: { course },
  });

  assert({
    tag,
    check: undefinedOrNull(course.enrolled_at) || typeof course.enrolled_at === "number",
    error: "course.enrolled_at must be a number (UNIX timestamp) or undefined/null",
    data: { course },
  });

  const badgeText = course.certificate_slug ? "Completed" : course.enrolled_at ? "Enrolled" : "";

  return (
    <a href={`/course/${course.slug}`} class="course-card">
      <img src={course.cover_url} height="180" width="320" alt={course.title} />
      <section>
        <h2>{course.title}</h2>
        <p>{course.overview}</p>
        <ul>
          {course.total_lessons && (
            <li title={`${truncateCount(course.total_lessons)} lessons`}>
              <img
                class="icon"
                src="/img/icons/presentation-chart-line.svg"
                alt="Lessons"
                height="18"
                width="18"
              />
              <span>{truncateCount(course.total_lessons)} Lessons</span>
            </li>
          )}
          {course.total_assignments && (
            <li title={`${truncateCount(course.total_assignments)} assignment(s)`}>
              <img
                class="icon"
                src="/img/icons/clipboard-document-list.svg"
                alt="Assignments"
                height="16"
                width="16"
              />
              <span>{truncateCount(course.total_assignments)} Assignments</span>
            </li>
          )}
          {badgeText && (
            <li>
              <span class="badge">{badgeText}</span>
            </li>
          )}
        </ul>
      </section>
    </a>
  );
}

export const truncateCount = (num) => {
  const convertedNum = Number(num);
  return Math.abs(convertedNum) > 999
    ? Math.sign(convertedNum) * parseFloat((Math.abs(convertedNum) / 1000).toFixed(1)) + "k"
    : convertedNum;
};
