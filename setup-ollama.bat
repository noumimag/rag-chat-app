@echo off
echo 🚀 Setting up Ollama for Local LLM Support
echo ==========================================

REM Check if Ollama is already installed
where ollama >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ Ollama is already installed
) else (
    echo 📥 Ollama not found. Please install it manually:
    echo    Download from: https://ollama.ai/download
    echo    Run the installer and restart your terminal
    pause
    exit /b 1
)

echo.
echo 🔧 Starting Ollama service...
start /B ollama serve

REM Wait for Ollama to start
echo ⏳ Waiting for Ollama to start...
timeout /t 5 /nobreak >nul

REM Check if Ollama is running
curl -s http://localhost:11434/api/tags >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ Ollama is running on http://localhost:11434
) else (
    echo ❌ Ollama failed to start. Please check if it's running.
    echo    Try running 'ollama serve' manually in a new terminal.
    pause
    exit /b 1
)

echo.
echo 📚 Downloading recommended models...
echo    This may take a while depending on your internet connection.

REM Download Llama 2 (7B) - good balance of speed/quality
echo 📥 Downloading llama2:7b...
ollama pull llama2:7b

REM Download Mistral (7B) - excellent performance
echo 📥 Downloading mistral:7b...
ollama pull mistral:7b

echo.
echo 🧪 Testing the models...
echo Testing llama2:7b...
ollama run llama2:7b "Hello! Can you confirm you're working?" --timeout 30s

echo.
echo 🎉 Setup complete! Your local LLM is ready to use.
echo.
echo 📋 Next steps:
echo    1. Make sure Ollama is running: ollama serve
echo    2. The RAG system is already configured to use local LLM
echo    3. Try asking a question in the chat interface
echo.
echo 🔧 Available models:
ollama list
echo.
echo 💡 Tips:
echo    - Use 'ollama run model:tag' to test models directly
echo    - Use 'ollama list' to see installed models
echo    - Use 'ollama rm model:tag' to remove models
echo    - Check 'ollama logs' for troubleshooting

echo.
echo ✨ Happy coding with your local LLM-powered RAG system!
pause 