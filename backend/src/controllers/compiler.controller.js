const compilerService = require('../services/compiler.service');

const compile = async (req, res, next) => {
  try {
    const { code, language } = req.body;
    
    const result = await compilerService.compile(code, language);
    
    res.json({
      success: true,
      output: result.output,
      error: result.error,
      executableName: result.executableName,
      compilationTime: result.compilationTime,
      executionTime: result.executionTime
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  compile
};