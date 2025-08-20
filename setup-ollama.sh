#!/bin/bash

echo "🚀 Setting up Ollama for Local LLM Support"
echo "=========================================="

# Check if Ollama is already installed
if command -v ollama &> /dev/null; then
    echo "✅ Ollama is already installed"
else
    echo "📥 Installing Ollama..."
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install ollama
        else
            echo "❌ Homebrew not found. Please install Homebrew first:"
            echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://ollama.ai/install.sh | sh
    else
        echo "❌ Unsupported OS: $OSTYPE"
        echo "   Please install Ollama manually from: https://ollama.ai/download"
        exit 1
    fi
fi

echo ""
echo "🔧 Starting Ollama service..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to start
echo "⏳ Waiting for Ollama to start..."
sleep 5

# Check if Ollama is running
if curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo "✅ Ollama is running on http://localhost:11434"
else
    echo "❌ Ollama failed to start. Please check the logs above."
    exit 1
fi

echo ""
echo "📚 Downloading recommended models..."
echo "   This may take a while depending on your internet connection."

# Download Llama 2 (7B) - good balance of speed/quality
echo "📥 Downloading llama2:7b..."
ollama pull llama2:7b

# Download Mistral (7B) - excellent performance
echo "📥 Downloading mistral:7b..."
ollama pull mistral:7b

echo ""
echo "🧪 Testing the models..."
echo "Testing llama2:7b..."
ollama run llama2:7b "Hello! Can you confirm you're working?" --timeout 30s

echo ""
echo "🎉 Setup complete! Your local LLM is ready to use."
echo ""
echo "📋 Next steps:"
echo "   1. Make sure Ollama is running: ollama serve"
echo "   2. The RAG system is already configured to use local LLM"
echo "   3. Try asking a question in the chat interface"
echo ""
echo "🔧 Available models:"
ollama list
echo ""
echo "💡 Tips:"
echo "   - Use 'ollama run model:tag' to test models directly"
echo "   - Use 'ollama list' to see installed models"
echo "   - Use 'ollama rm model:tag' to remove models"
echo "   - Check 'ollama logs' for troubleshooting"

# Stop the background Ollama process
kill $OLLAMA_PID 2>/dev/null

echo ""
echo "✨ Happy coding with your local LLM-powered RAG system!" 