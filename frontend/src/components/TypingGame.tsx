import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const TOTAL_WORDS = 5; // Total words per set
const WORD_DISPLAY_DELAY = 1000; // Time to show word (ms)
const FEEDBACK_DELAY = 1500; // Time to show feedback (ms)
const AI_THINKING_DELAY = 2000; // Minimum time to show AI thinking (ms)

interface TypingResult {
  word: string;
  input: string;
  correct: boolean;
  timeSpent: number; // Time spent typing in ms
}

const TypingGame: React.FC = () => {
  const [currentWord, setCurrentWord] = useState('');
  const [input, setInput] = useState('');
  const [results, setResults] = useState<TypingResult[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [accuracy, setAccuracy] = useState(100);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const navigate = useNavigate();
  const [childData, setChildData] = useState<{ username: string; therapistCode: string; sessionId: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [phase, setPhase] = useState<'initial' | 'analyzing' | 'targeted'>('initial');
  const [analysis, setAnalysis] = useState<{
    problematicLetters: string[];
    confusionPatterns: Array<{ confuses: string; with: string }>;
  } | null>(null);
  const [savingOnClose, setSavingOnClose] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('childData');
    if (!stored) {
      navigate('/child-login');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setChildData(parsed);

      // Check if child's preferred game is typing
      if (parsed.preferredGame !== 'typing') {
        console.log('Redirecting: not assigned to typing game');
        navigate('/landing');
        return;
      }

      // Generate first word
      generateInitialWord(parsed);
    } catch (err) {
      navigate('/child-login');
    }
  }, [navigate]);

  const generateInitialWord = async (data: { username: string; therapistCode: string; sessionId: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/typing/generate-initial-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: data.sessionId,
          username: data.username,
          therapistCode: data.therapistCode
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setCurrentWord(result.word);
        setLoading(false);
      } else {
        throw new Error(result.error || 'Failed to generate word');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      setLoading(false);
    }
  };

  const generateNextWord = async () => {
    if (!childData) return;
    
    setIsGeneratingWord(true);
    setError(null);
    setCurrentWord(''); // Clear current word while loading
    
    try {
      // Calculate accuracy to adjust difficulty
      const accuracy = results.length > 0 
        ? (results.filter(r => r.correct).length / results.length) * 100 
        : 100;
      setAccuracy(accuracy);
      
      // Adjust difficulty based on accuracy
      if (accuracy >= 90 && difficulty !== 'hard') {
        setDifficulty('hard');
      } else if (accuracy >= 70 && accuracy < 90 && difficulty !== 'medium') {
        setDifficulty('medium');
      } else if (accuracy < 70 && difficulty !== 'easy') {
        setDifficulty('easy');
      }
      
      // Minimum delay to show AI thinking animation
      const startTime = Date.now();
      
      // Use targeted words if available in session storage
      const targetedWordsStr = sessionStorage.getItem(`targetedWords_${childData.sessionId}`);
      if (targetedWordsStr && phase === 'targeted') {
        const targetedWords = JSON.parse(targetedWordsStr);
        const currentIndex = parseInt(sessionStorage.getItem(`targetedWordIndex_${childData.sessionId}`) || '0');
        
        if (currentIndex < targetedWords.length) {
          const elapsed = Date.now() - startTime;
          if (elapsed < WORD_DISPLAY_DELAY) {
            await new Promise(resolve => setTimeout(resolve, WORD_DISPLAY_DELAY - elapsed));
          }
          
          setCurrentWord(targetedWords[currentIndex]);
          sessionStorage.setItem(`targetedWordIndex_${childData.sessionId}`, (currentIndex + 1).toString());
          setIsGeneratingWord(false);
          setStartTime(Date.now());
          return;
        }
      }

      // Get next word from server for initial phase
      const response = await fetch('http://localhost:5000/api/typing/generate-next-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: childData.sessionId,
          username: childData.username,
          therapistCode: childData.therapistCode,
          typingHistory: results,
          phase: phase
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setCurrentWord(result.word);
        setIsGeneratingWord(false);
      } else {
        throw new Error(result.error || 'Failed to generate word');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      setIsGeneratingWord(false);
      // Fallback to a simple word if AI fails
      const fallbackWords = ['cat', 'dog', 'sun', 'tree', 'book'];
      setCurrentWord(fallbackWords[Math.floor(Math.random() * fallbackWords.length)]);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentWord || input.trim() === '' || !startTime) return;

    const endTime = Date.now();
    const timeSpent = endTime - startTime;
    const userWord = input.trim().toLowerCase();
    const targetWord = currentWord.toLowerCase();
    const correct = userWord === targetWord;
    
    // Calculate mistakes in this word
    let wordMistakes = 0;
    for (let i = 0; i < Math.max(userWord.length, targetWord.length); i++) {
      if (userWord[i] !== targetWord[i]) {
        wordMistakes++;
      }
    }
    setTotalMistakes(prev => prev + wordMistakes);
    
    // Calculate current accuracy
    const newAccuracy = Math.max(0, Math.min(100, (1 - (wordMistakes / targetWord.length)) * 100));
    setAccuracy(prev => (prev + newAccuracy) / 2); // Rolling average
    
    const entry = { 
      word: currentWord, 
      input: userWord,
      correct,
      timeSpent,
      mistakes: wordMistakes
    };
    
    const newResults = [...results, entry];
    setResults(newResults);
    setInput('');
    setWordCount(wordCount + 1);

    // Show detailed feedback with improved visualization
    if (correct) {
      setMessage(`✓ Perfect! Time: ${(timeSpent / 1000).toFixed(1)}s\nAccuracy: ${accuracy.toFixed(1)}%`);
    } else {
      const inputWord = input.trim().toLowerCase();
      let feedback = `The word was: ${currentWord}\n`;
      
      // Create visual comparison
      let comparison = '';
      const maxLen = Math.max(inputWord.length, currentWord.length);
      
      for (let i = 0; i < maxLen; i++) {
        if (i < inputWord.length && i < currentWord.length) {
          if (inputWord[i] === currentWord[i].toLowerCase()) {
            comparison += '✓';
          } else {
            comparison += '✗';
          }
        } else {
          comparison += '✗';
        }
      }
      
      feedback += `Your typing: ${inputWord}\n`;
      feedback += `Accuracy:   ${comparison}\n\n`;
      
      // Add specific learning tips
      if (inputWord.length !== currentWord.length) {
        feedback += `Tip: Pay attention to word length. `;
        feedback += inputWord.length < currentWord.length ? 'You missed some letters.' : 'You added extra letters.';
      } else {
        const diffPositions = [];
        for (let i = 0; i < inputWord.length; i++) {
          if (inputWord[i] !== currentWord[i].toLowerCase()) {
            diffPositions.push({ pos: i, typed: inputWord[i], expected: currentWord[i] });
          }
        }
        if (diffPositions.length > 0) {
          feedback += `Focus on: ${diffPositions.map(d => 
            `'${d.expected}' (typed '${d.typed}')`
          ).join(', ')}`;
        }
      }
      
      setMessage(feedback);
    }

    // Clear feedback after delay
    setTimeout(() => setMessage(null), FEEDBACK_DELAY);

    // Check if we've reached the total word count
    if (wordCount + 1 >= TOTAL_WORDS) {
      if (phase === 'initial' && childData) {
        // Show transition message
        setMessage("Analyzing your typing patterns...");
        setPhase('analyzing');
        
        try {
          // Artificial delay for analysis animation
          await new Promise(resolve => setTimeout(resolve, AI_THINKING_DELAY));
          
          const analysisResp = await fetch('http://localhost:5000/api/analyze-typing-results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              therapistCode: childData.therapistCode,
              username: childData.username,
              sessionId: childData.sessionId,
              results: newResults
            })
          });

          const analysisData = await analysisResp.json();
          if (analysisData.success) {
            setAnalysis(analysisData.analysis);
            
            // Show analysis results
            let feedbackMessage = "First set completed!\n\n";
            if (analysisData.analysis.problematicLetters.length > 0) {
              feedbackMessage += `Letters to focus on: ${analysisData.analysis.problematicLetters.join(', ')}\n`;
            }
            feedbackMessage += "\nLet's practice with some targeted words...";
            setMessage(feedbackMessage);
            
            // Get targeted words based on analysis
            const targetedResp = await fetch('http://localhost:5000/api/typing/generate-targeted-words', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                therapistCode: childData.therapistCode,
                username: childData.username,
                sessionId: childData.sessionId,
                analysis: analysisData.analysis
              })
            });
            
            const targetedData = await targetedResp.json();
            if (targetedData.success) {
              // Show the targeted words approach
              await new Promise(resolve => setTimeout(resolve, FEEDBACK_DELAY));
              
              // Store targeted words in session storage
              sessionStorage.setItem(`targetedWords_${childData.sessionId}`, JSON.stringify(targetedData.words));
              sessionStorage.setItem(`targetedWordIndex_${childData.sessionId}`, '0');
              
              // Reset for targeted practice set
              setResults(prevResults => {
                sessionStorage.setItem(`firstSetResults_${childData.sessionId}`, JSON.stringify(prevResults));
                return [];
              });
              
              setWordCount(0);
              setPhase('targeted');
              setIsGeneratingWord(true);
              
              // Delay before showing first targeted word
              await new Promise(resolve => setTimeout(resolve, WORD_DISPLAY_DELAY));
              setCurrentWord(targetedData.words[0]);
              setIsGeneratingWord(false);
              setStartTime(Date.now());
            }
          }
        } catch (err) {
          console.error('Error in analysis phase:', err);
          setError('Failed to analyze results and generate targeted words');
        }
      } else if (phase === 'targeted' && childData) {
        // Show completion message
        setMessage("Completing final analysis...");
        
        // Add artificial delay for analysis
        await new Promise(resolve => setTimeout(resolve, AI_THINKING_DELAY));
        
        // Second set complete: combine both sets and save
        const firstSetResults = JSON.parse(sessionStorage.getItem(`firstSetResults_${childData.sessionId}`) || '[]');
        const allResults = [...firstSetResults, ...newResults];
        await saveResults(allResults);
        
        // Clean up session storage
        sessionStorage.removeItem(`targetedWords_${childData.sessionId}`);
        sessionStorage.removeItem(`targetedWordIndex_${childData.sessionId}`);
        sessionStorage.removeItem(`firstSetResults_${childData.sessionId}`);
      }
    } else {
      // Generate next word after a brief delay
      setTimeout(() => {
        generateNextWord();
      }, 1600);
    }
  };

  const saveResults = async (finalResults: Array<{ word: string; input: string; correct: boolean }>) => {
    if (!childData) return;
    
    setLoading(true);
    try {
      const payload = {
        therapistCode: childData.therapistCode,
        username: childData.username,
        sessionId: childData.sessionId,
        results: finalResults,
        analysis: analysis, // Include the analysis from both sets
        isComplete: true // Indicate this is the complete assessment
      };
      
      const resp = await fetch('http://localhost:5000/api/save-typing-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await resp.json();
      
      if (resp.ok) {
        // Show final analysis with improvement comparison
        if (data.finalAnalysis) {
          setAnalysis(data.finalAnalysis);
          setMessage(
            '🎉 Assessment complete!\n' + 
            'Your results have been saved and will help your therapist understand your progress.'
          );
        } else {
          setMessage('🎉 Assessment complete! Results saved.');
        }
        
        setTimeout(() => {
          navigate('/landing');
        }, 3000);
      } else {
        setMessage(data.error || 'Failed to save results');
        setLoading(false);
      }
    } catch (err: any) {
      setMessage('Network error while saving results');
      setLoading(false);
    }
  };

  if (!childData) return <Container>Loading...</Container>;

  if (loading && wordCount === 0) {
    return (
      <Container>
        <Card>
          <LoadingSpinner>🔄</LoadingSpinner>
          <LoadingText>Generating your first word...</LoadingText>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <CloseButton
          title="Exit and save"
          aria-label="Exit and save"
          onClick={async () => {
            // If there are results, save them, otherwise just go home
            if (savingOnClose) return;
            setSavingOnClose(true);
            try {
              if (results && results.length > 0 && childData) {
                await fetch('http://localhost:5000/api/save-typing-results', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    therapistCode: childData.therapistCode,
                    username: childData.username,
                    sessionId: childData.sessionId,
                    results
                  })
                });
              }
            } catch (err) {
              console.error('Failed to save on close', err);
            } finally {
              setSavingOnClose(false);
              navigate('/landing');
            }
          }}
        >
          ×
        </CloseButton>
        <Header>
          <Title>🎯 AI Typing Practice</Title>
          <Subtitle>Type the word exactly as shown</Subtitle>
        </Header>

        {error && <ErrorMessage>⚠️ {error}</ErrorMessage>}

        <ProgressBar>
          <ProgressFill progress={(wordCount / TOTAL_WORDS) * 100} />
        </ProgressBar>
        <ProgressText>{wordCount} / {TOTAL_WORDS} words completed</ProgressText>

        {isGeneratingWord ? (
          <WordBox>
            <LoadingSpinner>🔄</LoadingSpinner>
            <SmallLoadingText>Generating next word...</SmallLoadingText>
          </WordBox>
        ) : (
          <>
            <WordBox>{currentWord}</WordBox>
            <Form onSubmit={handleSubmit}>
              <TextInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type here..."
                autoFocus
                disabled={loading || isGeneratingWord}
              />
              <SubmitButton 
                type="submit" 
                disabled={loading || isGeneratingWord || input.trim() === ''}
              >
                Submit
              </SubmitButton>
            </Form>
          </>
        )}

        {message && (
          <FeedbackMessage correct={message.includes('✓')}>
            {message}
          </FeedbackMessage>
        )}

        {results.length > 0 && (
          <ResultsSection>
            <ResultsTitle>Recent Results:</ResultsTitle>
            
            {analysis?.problematicLetters && analysis.problematicLetters.length > 0 && (
              <ProblemLetters>
                Most affected letters: {analysis.problematicLetters.join(', ')}
              </ProblemLetters>
            )}

            <ResultsList>
              {results.slice(-5).reverse().map((r, idx) => (
                <ResultItem key={idx} correct={r.correct}>
                  <span>{r.correct ? '✓' : '✗'}</span>
                  <span>{r.word}</span>
                  <span className="typed">→ {r.input}</span>
                </ResultItem>
              ))}
            </ResultsList>
          </ResultsSection>
        )}

        <InfoBox>
          💡 The AI adapts to your typing patterns and helps identify which letters you might be confusing!
        </InfoBox>
      </Card>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const Card = styled.div`
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 520px;
  text-align: center;
  position: relative;
`;

const Header = styled.div`
  margin-bottom: 24px;
`;

const Title = styled.h2`
  margin: 0 0 8px 0;
  font-size: 28px;
  color: #333;
`;

const Subtitle = styled.p`
  color: #666;
  margin: 0;
  font-size: 14px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
`;

const ProgressFill = styled.div<{ progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  color: #666;
  font-size: 14px;
  margin-bottom: 20px;
`;

const WordBox = styled.div`
  font-size: 36px;
  font-weight: 700;
  padding: 24px 16px;
  margin: 20px 0;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 12px;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  letter-spacing: 2px;
`;

const Form = styled.form`
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 16px;
`;

const TextInput = styled.input`
  padding: 14px 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  width: 280px;
  font-size: 18px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #667eea;
  }

  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
`;

const SubmitButton = styled.button`
  padding: 14px 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FeedbackMessage = styled.div<{ correct: boolean }>`
  padding: 12px 20px;
  margin: 16px 0;
  border-radius: 8px;
  font-weight: 600;
  background: ${props => props.correct ? '#d4edda' : '#f8d7da'};
  color: ${props => props.correct ? '#155724' : '#721c24'};
  animation: slideIn 0.3s ease;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const LoadingSpinner = styled.div`
  font-size: 32px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: #666;
  margin-top: 16px;
  font-size: 16px;
`;

const SmallLoadingText = styled.p`
  color: white;
  margin: 0;
  font-size: 14px;
  font-weight: normal;
`;

const ErrorMessage = styled.div`
  background: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
`;

const ResultsSection = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 2px solid #e0e0e0;
`;

const ResultsTitle = styled.h3`
  font-size: 16px;
  color: #333;
  margin: 0 0 12px 0;
`;

const ProblemLetters = styled.div`
  font-size: 14px;
  color: #d9534f;
  margin-bottom: 8px;
  font-weight: 600;
`;

const ResultsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ResultItem = styled.div<{ correct: boolean }>`
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  background: ${props => props.correct ? '#f0f8ff' : '#fff5f5'};
  border-radius: 6px;
  font-size: 14px;
  text-align: left;

  span:first-child {
    font-weight: bold;
    color: ${props => props.correct ? '#28a745' : '#dc3545'};
  }

  span:nth-child(2) {
    font-weight: 600;
    min-width: 80px;
  }

  .typed {
    color: #666;
    font-style: italic;
  }
`;

const InfoBox = styled.div`
  background: #e7f3ff;
  color: #004085;
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-top: 20px;
  line-height: 1.5;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: #ff6b6b;
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(0,0,0,0.12);
  transition: transform 0.12s ease, box-shadow 0.12s ease;

  &:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(0,0,0,0.14); }
`;

export default TypingGame;
