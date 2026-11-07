import { CourseCard } from "@/components/course-card"
import { Navbar } from "@/components/navbar"
import type { Account } from "@/types/account"
import type { CourseDisplay } from "@/types/course"
import type { Review } from "@/types/review"

import { HomeFooter } from "./home-footer"
import { HomeHero } from "./home-hero"
import { HomeHeroHeader } from "./home-hero-header"
import { HomeReviews } from "./home-reviews"

/** The widest grid's row, so every cover visible on load at any breakpoint is fetched eagerly. */
const FIRST_ROW_COURSE_COUNT = 3

/** Without an account this is the landing page, which `/home` also shows to signed-in users. */
export function HomePage({
  account,
  courses,
  lessonCounts,
  assignmentCounts,
  reviews,
}: {
  account: Account | null
  courses: CourseDisplay[]
  lessonCounts: Map<number, number>
  assignmentCounts: Map<number, number>
  reviews: Review[]
}) {
  const CoursesHeading = account ? "h1" : "h2"

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {account ? <Navbar account={account} /> : <HomeHeroHeader />}
      <main className="flex flex-1 flex-col gap-10 px-6 py-8 sm:px-8">
        {!account && <HomeHero hasReviews={reviews.length > 0} />}
        <section
          id="courses"
          className="mx-auto w-full max-w-6xl scroll-mt-20 flex flex-col gap-y-4"
        >
          <CoursesHeading className="font-bold text-3xl">Courses</CoursesHeading>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course, index) => (
              <CourseCard
                key={course.slug}
                course={course}
                lessonCount={lessonCounts.get(course.id)}
                assignmentCount={assignmentCounts.get(course.id)}
                loading={index < FIRST_ROW_COURSE_COUNT ? "eager" : "lazy"}
              />
            ))}
          </div>
        </section>
        {!account && <HomeReviews reviews={reviews} />}
      </main>
      <HomeFooter />
    </div>
  )
}
