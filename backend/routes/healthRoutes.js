const express = require('express');
const router  = express.Router();
const { getHealthData, updateHealthDay } = require('../controller/healthController');

router.get('/',        getHealthData);
router.post('/update', updateHealthDay);

module.exports = router;
