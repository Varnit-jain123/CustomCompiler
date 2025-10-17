const express = require('express');
const router = express.Router();
const executablesController = require('../controllers/executables.controller');
const { validateExecutableName } = require('../middleware/validation.middleware');

router.get('/', executablesController.listExecutables);

router.post(
  '/:execName/run',
  validateExecutableName,
  executablesController.runExecutable
);

router.delete(
  '/:execName',
  validateExecutableName,
  executablesController.deleteExecutable
);

router.get(
  '/:execName/download',
  validateExecutableName,
  executablesController.downloadExecutable
);

module.exports = router;