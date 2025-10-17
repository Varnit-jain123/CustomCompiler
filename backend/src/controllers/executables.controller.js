const compilerService = require('../services/compiler.service');

const listExecutables = async (req, res, next) => {
  try {
    const executables = await compilerService.listExecutables();
    
    res.json({
      success: true,
      executables,
      count: executables.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const runExecutable = async (req, res, next) => {
  try {
    const { execName } = req.params;
    
    const result = await compilerService.runExecutable(execName);
    
    res.json({
      success: result.success,
      output: result.output,
      error: result.error,
      executionTime: result.executionTime
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const deleteExecutable = async (req, res, next) => {
  try {
    const { execName } = req.params;
    
    await compilerService.deleteExecutable(execName);
    
    res.json({
      success: true,
      message: `Deleted executable: ${execName}`
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const downloadExecutable = async (req, res, next) => {
  try {
    const { execName } = req.params;
    
    const executablePath = await compilerService.getExecutablePath(execName);
    
    res.download(executablePath, execName, (err) => {
      if (err) {
        res.status(500).json({
          success: false,
          error: 'Failed to download executable'
        });
      }
    });
    
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  listExecutables,
  runExecutable,
  deleteExecutable,
  downloadExecutable
};