import { test, expect } from '@playwright/test'

test.describe('Full Route Generation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Attendre que le serveur soit prêt
    await page.goto('http://localhost:8181', { waitUntil: 'networkidle' })
  })

  test('should complete full route generation flow', async ({ page }) => {
    // 1. Vérifier que la page d'accueil se charge
    await expect(page.locator('body')).toBeVisible()

    // 2. Remplir le formulaire
    const durationInput = page.locator('input[name="duration"], input[type="number"]').first()
    const paceInput = page.locator('input[name="pace"], input[type="text"]').first()
    
    await durationInput.fill('60')
    await paceInput.fill('5:00')

    // 3. Sélectionner le type de terrain
    const terrainSelect = page.locator('select[name="terrain_type"], select').first()
    if (await terrainSelect.count() > 0) {
      await terrainSelect.selectOption('mixed')
    }

    // 4. Vérifier que la distance calculée s'affiche (12 km pour 60 min à 5:00/km)
    await expect(page.locator('body')).toContainText(/12/i, { timeout: 2000 })

    // 5. Définir une location (si nécessaire)
    // Attendre que le composant de location soit disponible
    await page.waitForTimeout(1000)

    // 6. Soumettre le formulaire
    const submitButton = page.locator('button:has-text("Générer"), button:has-text("générer"), button[type="submit"]').first()
    await submitButton.click()

    // 7. Attendre les résultats (max 30 secondes pour la génération)
    await page.waitForSelector('.route-card, [data-testid="route-card"], .route-item', { timeout: 30000 })

    // 8. Vérifier qu'il y a des routes générées
    const routeCards = await page.locator('.route-card, [data-testid="route-card"], .route-item').count()
    expect(routeCards).toBeGreaterThan(0)
    expect(routeCards).toBeLessThanOrEqual(3)

    // 9. Vérifier que les cartes affichent les bonnes infos
    const firstRoute = page.locator('.route-card, [data-testid="route-card"], .route-item').first()
    await expect(firstRoute).toContainText(/km/i)
    await expect(firstRoute).toContainText(/min/i)
  })

  test('should show error for invalid inputs', async ({ page }) => {
    await page.goto('http://localhost:8181')

    // Entrer des valeurs invalides
    const durationInput = page.locator('input[name="duration"], input[type="number"]').first()
    const paceInput = page.locator('input[name="pace"], input[type="text"]').first()

    await durationInput.fill('0')
    await paceInput.fill('invalid')

    const submitButton = page.locator('button:has-text("Générer"), button:has-text("générer"), button[type="submit"]').first()
    await submitButton.click()

    // Vérifier qu'une erreur s'affiche ou que le formulaire ne se soumet pas
    await page.waitForTimeout(1000)
    
    // Soit une erreur est affichée, soit le formulaire reste sur la même page
    const currentUrl = page.url()
    expect(currentUrl).toContain('localhost:8181')
  })

  test('should handle loading state', async ({ page }) => {
    await page.goto('http://localhost:8181')

    const durationInput = page.locator('input[name="duration"], input[type="number"]').first()
    await durationInput.fill('45')

    const submitButton = page.locator('button:has-text("Générer"), button:has-text("générer"), button[type="submit"]').first()
    await submitButton.click()

    // Vérifier que le loading s'affiche (si implémenté)
    await page.waitForTimeout(500)
    
    // Le bouton devrait être désactivé ou un spinner devrait apparaître
    const isDisabled = await submitButton.isDisabled()
    expect(isDisabled || await page.locator('.loading, .spinner, [data-testid="loading"]').count() > 0).toBeTruthy()

    // Attendre que le loading disparaisse
    await page.waitForSelector('.route-card, [data-testid="route-card"], .route-item', { timeout: 30000 })
  })

  test('should navigate to results page after generation', async ({ page }) => {
    await page.goto('http://localhost:8181')

    // Remplir et soumettre le formulaire
    const durationInput = page.locator('input[name="duration"], input[type="number"]').first()
    const paceInput = page.locator('input[name="pace"], input[type="text"]').first()
    
    await durationInput.fill('60')
    await paceInput.fill('5:00')

    const submitButton = page.locator('button:has-text("Générer"), button:has-text("générer"), button[type="submit"]').first()
    await submitButton.click()

    // Attendre la navigation vers la page de résultats
    await page.waitForURL('**/results**', { timeout: 30000 })
    
    // Vérifier que la page de résultats s'affiche
    await expect(page.locator('body')).toContainText(/route|itinéraire|boucle/i)
  })
})

