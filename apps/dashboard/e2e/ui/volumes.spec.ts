import { test, expect } from "@playwright/test"

/** Run against a Cinder-enabled seeded project with the deployment's verified read policy. */
test.describe("Volumes and snapshots", () => {
  const projectId = process.env.TEST_VOLUME_PROJECT_ID
  test.skip(!projectId, "Set TEST_VOLUME_PROJECT_ID to a Cinder-enabled seeded project ID.")

  test("lists volumes, opens details, and loads scoped snapshots", async ({ page }) => {
    await page.goto(`/projects/${projectId}/volumes`)
    await expect(page.getByRole("navigation", { name: "Block storage resources" })).toBeVisible()
    await expect(page.getByPlaceholder("Search volumes by name or ID...")).toBeVisible()
    const firstRow = page.locator('[data-testid^="storage-row-"]').first()
    await expect(firstRow).toBeVisible()
    await firstRow.click()
    await expect(page.getByTestId("volume-detail")).toBeVisible()
    await expect(page.getByRole("navigation", { name: "Block storage resources" })).not.toBeVisible()
    await page.getByText("Snapshots of this volume", { exact: true }).click()
    await expect(
      page.getByTestId("snapshots-table").or(page.getByText("No Snapshots for This Volume", { exact: true }))
    ).toBeVisible()
  })

  test("opens the snapshots peer tab and follows a source-volume link", async ({ page }) => {
    await page.goto(`/projects/${projectId}/volumes`)
    await page
      .getByRole("navigation", { name: "Block storage resources" })
      .getByText("Snapshots", { exact: true })
      .click()
    await expect(page.getByPlaceholder("Search snapshots by name or ID...")).toBeVisible()
    await expect(page.getByTestId("snapshots-table")).toBeVisible()
    await page.locator('[data-testid^="storage-row-"]').first().click()
    await expect(page.getByTestId("snapshot-detail")).toBeVisible()
    await expect(
      page.getByTestId("snapshot-detail").locator(`a[href^="/projects/${projectId}/volumes/"]`)
    ).toBeVisible()
    await page.getByTestId("snapshot-detail").locator(`a[href^="/projects/${projectId}/volumes/"]`).click()
    await expect(page.getByTestId("volume-detail")).toBeVisible()
  })
})
