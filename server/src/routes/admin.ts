import express from 'express'
import * as GraphCache from '../services/graph-cache'
const router = express.Router()

router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await GraphCache.cacheStats()
    res.json({ success: true, cache: stats })
  } catch (e:any) {
    res.status(500).json({ success: false, error: e.message })
  }
})
router.delete('/cache', async (req, res) => {
  try {
    await GraphCache.cleanupCache()
    res.json({ success:true, message:'Cache cleared successfully' })
  } catch(e:any) {
    res.status(500).json({ success: false, error:e.message })
  }
})
router.delete('/cache/:key', async (req, res) => {
  try {
    res.json({ success:true, message: 'Not implemented yet'})
  } catch(e:any) {
    res.status(500).json({ success: false, error:e.message })
  }
})
export default router
