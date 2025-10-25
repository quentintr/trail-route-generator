/**
 * Script de test pour les services de cartographie
 * 
 * Ce script teste tous les services de cartographie
 * et affiche les résultats pour vérifier leur bon fonctionnement.
 */

import { demonstrateMappingServices } from '../examples/mapping-example'

/**
 * Fonction principale de test
 */
async function testMappingServices() {
  console.log('🧪 Test des services de cartographie')
  console.log('====================================')
  
  try {
    // Lancer la démonstration complète
    await demonstrateMappingServices()
    
    console.log('\n✅ Tous les tests sont passés avec succès!')
    console.log('🎉 Les services de cartographie sont opérationnels')
    
  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error)
    console.error('🔧 Vérifiez la configuration des services')
    process.exit(1)
  }
}

// Exécuter les tests si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  testMappingServices()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Erreur fatale:', error)
      process.exit(1)
    })
}

export { testMappingServices }
