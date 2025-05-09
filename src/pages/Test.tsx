import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabase } from '../hooks/useSupabase';
import Button from '../components/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/Card';
import { Clock, ArrowLeft, Check } from 'lucide-react';
import Dialog from '../components/Dialog';

interface Question {
  question_id: string;
  test_id: string;
  category: string;
  sub_category: string;
  question_text: string;
  options: string;
  correct_answer: string;
}

interface UserAnswer {
  question_id: string;
  selectedOption: string;
}

interface TestDetailsType {
  test_id: string;
  title: string;
  time_limit: number;
  questions_count: number;
  created_at: string;
  created_by: string;
}

const TestPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { supabase, user } = useSupabase();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [test, setTest] = useState<TestDetailsType | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [testCompleted, setTestCompleted] = useState<boolean>(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<React.ReactNode | null>(null);
  
  const openDialog = (content: React.ReactNode) => {
    setDialogContent(content);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setDialogContent(null);
  };

  const handleSubmitTest = useCallback(async () => {
    if (submitting) return;
    
    try {
      setSubmitting(true);
      
      // Calculate score
      let correctCount = 0;
      // console.log('--- Test Score Debugging ---');
      // console.log(`Total questions: ${questions.length}`);
      // console.log('Current user answers:', userAnswers);
      
      questions.forEach((question) => {
        const userAnswer = userAnswers.find(a => a.question_id === question.question_id);
        const selectedOptionIndex = userAnswer?.selectedOption || '';
        const options = JSON.parse(question.options);
        
        // console.log('Question:', question.question_text);
        // console.log('User answer index:', selectedOptionIndex);
        // console.log('User selected option:', selectedOptionIndex !== '' ? options[parseInt(selectedOptionIndex)] : 'Not answered');
        // console.log('Stored correct answer:', question.correct_answer);
        
        // Check if the user's answer matches the correct answer
        // The correct_answer is stored in "Option X" format where X is the 1-based index
        let isCorrect = false;
        
        if (selectedOptionIndex !== '') {
          // Handle "Option X" format (1-based) vs selectedOptionIndex (0-based)
          if (question.correct_answer.startsWith('Option ')) {
            // Extract the number from "Option X" (which is 1-based)
            const correctOptionNumber = parseInt(question.correct_answer.replace('Option ', ''));
            // Adjust for 0-based index in our selections
            const correctOptionIndex = (correctOptionNumber - 1).toString();
            
            // console.log('Parsed correct option number:', correctOptionNumber);
            // console.log('Corresponding 0-based index:', correctOptionIndex);
            
            if (selectedOptionIndex === correctOptionIndex) {
              isCorrect = true;
            }
          } 
          // Fallback to the old methods for backward compatibility
          else if (question.correct_answer === selectedOptionIndex) {
            isCorrect = true;
          } 
          else if (question.correct_answer === options[parseInt(selectedOptionIndex)]) {
            isCorrect = true;
          }
        }
        
        // console.log('Is answer correct?', isCorrect);
        // console.log('------------------------');
        
        if (isCorrect) {
          correctCount++;
        }
      });
      
      // console.log(`Final score: ${correctCount}/${questions.length} (${(correctCount / questions.length * 100).toFixed(2)}%)`);
      
      const scoreData = {
        correct: correctCount,
        total: questions.length
      };
      setScore(scoreData);
      
      // Save attempt to database
      await supabase.from('attempts').insert({
        user_id: user?.id,
        test_id: testId,
        score: correctCount,
        total_questions: questions.length,
        percentage: (correctCount / questions.length) * 100,
        completed_at: new Date().toISOString(),
      });
      
      setTestCompleted(true);
      
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('Error submitting test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [questions, userAnswers, submitting, supabase, user, testId]);

  const handleConfirmSubmit = () => {
    const unansweredCount = userAnswers.filter(a => a.selectedOption === '').length;
    openDialog(
      <div className="dialog-content space-y-4">
        <h3 className="text-lg font-semibold">Confirm Test Submission</h3>
        {unansweredCount > 0 && (
          <p className="text-yellow-600">
            Warning: You have {unansweredCount} unanswered questions.
          </p>
        )}
        <p>Are you sure you want to submit the test?</p>
        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={() => {
              closeDialog();
              handleSubmitTest();
            }}
          >
            Submit Test
          </Button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!testId) {
      setError("No test ID provided");
      setLoading(false);
      return;
    }

    const fetchTestAndQuestions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching test with ID:", testId);

        // Fetch test details
        const { data: testData, error: testError } = await supabase
          .from('tests')
          .select('*')
          .eq('test_id', testId)
          .single();

        if (testError) {
          console.error("Error fetching test:", testError);
          throw new Error(`Failed to load test: ${testError.message}`);
        }

        if (!testData) {
          throw new Error("Test not found");
        }

        console.log("Test data fetched:", testData);
        
        // Check for existing timer in localStorage
        const storedEndTime = localStorage.getItem(`test_${testId}_end_time`);
        if (storedEndTime) {
          const endTime = parseInt(storedEndTime);
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
          
          if (remaining > 0) {
            setTimeRemaining(remaining);
          } else {
            // Time's up, submit the test
            handleSubmitTest();
            return;
          }
        } else {
          // Set new end time in localStorage
          const endTime = Date.now() + (testData.time_limit * 60 * 1000);
          localStorage.setItem(`test_${testId}_end_time`, endTime.toString());
          setTimeRemaining(testData.time_limit * 60);
        }

        // Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('test_id', testId);

        if (questionsError) {
          console.error("Error fetching questions:", questionsError);
          throw new Error(`Failed to load questions: ${questionsError.message}`);
        }

        if (!questionsData || questionsData.length === 0) {
          console.log("No questions found for test:", testId);
          setQuestions([]);
          setLoading(false);
          return;
        }

        console.log(`Loaded ${questionsData.length} questions`);
        
        // Group questions by category
        const questionsByCategory = questionsData.reduce((acc, question) => {
          if (!acc[question.category]) {
            acc[question.category] = [];
          }
          acc[question.category].push(question);
          return acc;
        }, {} as Record<string, Question[]>);

        const categories = Object.keys(questionsByCategory);
        const totalCategories = categories.length;
        
        // If questions_count is set and less than total questions, sample evenly from categories
        let selectedQuestions: Question[] = questionsData;
        
        if (testData.questions_count && testData.questions_count < questionsData.length) {
          // Calculate questions per category (rounded down)
          const baseQuestionsPerCategory = Math.floor(testData.questions_count / totalCategories);
          
          // Calculate remaining questions to distribute
          let remainingQuestions = testData.questions_count - (baseQuestionsPerCategory * totalCategories);
          
          selectedQuestions = [];
          
          // Sample from each category
          categories.forEach(category => {
            const categoryQuestions = questionsByCategory[category];
            // Add one extra question from this category if we have remaining questions
            const questionsToTake = baseQuestionsPerCategory + (remainingQuestions > 0 ? 1 : 0);
            remainingQuestions--;
            
            // Shuffle and take required number of questions
            const shuffled = [...categoryQuestions].sort(() => 0.5 - Math.random());
            selectedQuestions.push(...shuffled.slice(0, questionsToTake));
          });

          // Final shuffle of selected questions
          selectedQuestions = selectedQuestions.sort(() => 0.5 - Math.random());
          
          console.log(`Randomly selected ${selectedQuestions.length} questions across ${totalCategories} categories`);
        }
        
        setQuestions(selectedQuestions);
        
        // Initialize user answers
        const initialAnswers = selectedQuestions.map(q => ({
          question_id: q.question_id,
          selectedOption: ''
        }));
        setUserAnswers(initialAnswers);

      } catch (error: any) {
        console.error('Error fetching test data:', error);
        setError(error.message || "Failed to load test");
      } finally {
        setLoading(false);
      }
    };

    fetchTestAndQuestions();
  }, [testId, supabase, user]);

  // Clean up localStorage when test completes
  useEffect(() => {
    if (testCompleted && testId) {
      localStorage.removeItem(`test_${testId}_end_time`);
    }
  }, [testCompleted, testId]);

  // Timer effect
  useEffect(() => {
    if (loading || testCompleted || !timeRemaining) return;

    const timer = setInterval(() => {
      const storedEndTime = localStorage.getItem(`test_${testId}_end_time`);
      if (storedEndTime) {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((parseInt(storedEndTime) - now) / 1000));
        
        if (remaining <= 0) {
          clearInterval(timer);
          handleSubmitTest();
        } else {
          setTimeRemaining(remaining);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, testCompleted, timeRemaining, handleSubmitTest, testId]);

  const handleAnswerSelect = (questionId: string, option: string) => {
    console.log('Answer selected:', { questionId, optionIndex: option });
    const question = questions.find(q => q.question_id === questionId);
    
    if (question) {
      const options = JSON.parse(question.options);
      console.log('Question:', question.question_text);
      console.log('Selected option text:', options[parseInt(option)]);
    }
    
    // Update the answers with the new selection using functional state update
    setUserAnswers(prevAnswers => {
      // Find if answer exists
      const existingAnswerIndex = prevAnswers.findIndex(a => a.question_id === questionId);
      
      if (existingAnswerIndex !== -1) {
        // Create a new array with the updated answer
        const newAnswers = [...prevAnswers];
        newAnswers[existingAnswerIndex] = { 
          ...newAnswers[existingAnswerIndex], 
          selectedOption: option 
        };
        console.log('Updated answers state:', newAnswers);
        return newAnswers;
      } else {
        // If it doesn't exist for some reason, add it
        const newAnswers = [...prevAnswers, { question_id: questionId, selectedOption: option }];
        console.log('Updated answers state (added new):', newAnswers);
        return newAnswers;
      }
    });
  };

  const navigateToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-100">
        <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-6">Error</h1>
          <p className="text-center text-red-500 mb-8">{error}</p>
          <div className="flex justify-center">
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (testCompleted && score) {
    return (
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-500" strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-bold text-center mb-6">Test Completed</h1>
            
            <div className="text-center mb-8">
              <p className="text-gray-600">
                Thank you for completing the test. Your responses have been recorded.
              </p>
              <p className="text-gray-500 mt-2">
                The test administrator will review your submission.
              </p>
            </div>
            
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-6">No Questions Found</h1>
          <p className="text-center mb-8">This test has no questions.</p>
          <div className="flex justify-center">
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = userAnswers.find(a => a.question_id === currentQuestion.question_id);
  const options = JSON.parse(currentQuestion.options);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center"
          >
            <ArrowLeft size={16} className="mr-1" />
            Exit
          </Button>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmSubmit}
              isLoading={submitting}
            >
              Submit Test
            </Button>
            <div className="flex items-center text-red-500">
              <Clock size={18} className="mr-1" />
              <span className="font-mono">{formatTime(timeRemaining)}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-500">Question {currentQuestionIndex + 1} of {questions.length}</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex justify-between">
                <span>{currentQuestion.category}</span>
                {currentQuestion.sub_category && (
                  <span className="text-sm text-gray-500">{currentQuestion.sub_category}</span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-6">{currentQuestion.question_text}</p>

            <div className="space-y-3">
              {options.map((option: string, index: number) => (
                <div 
                  key={index}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    currentAnswer?.selectedOption === index.toString() 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleAnswerSelect(currentQuestion.question_id, index.toString())}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className={`w-5 h-5 border rounded-full flex items-center justify-center ${
                        currentAnswer?.selectedOption === index.toString() 
                          ? 'border-blue-500 bg-blue-500 text-white' 
                          : 'border-gray-300'
                      }`}>
                        {currentAnswer?.selectedOption === index.toString() && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <div className="ml-3">
                      <p>{option}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-between">
          <Button 
            variant="secondary"
            onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          {currentQuestionIndex < questions.length - 1 ? (
            <Button onClick={() => navigateToQuestion(currentQuestionIndex + 1)}>
              Next
            </Button>
          ) : (
            <Button 
              variant="primary" 
              onClick={handleSubmitTest}
              isLoading={submitting}
            >
              Submit Test
            </Button>
          )}
        </div>

        <div className="mt-8">
          <div className="flex flex-wrap gap-2">
            {questions.map((q, index) => {
              const answer = userAnswers.find(a => a.question_id === q.question_id);
              return (
                <button
                  key={q.question_id}
                  onClick={() => navigateToQuestion(index)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-sm
                    ${index === currentQuestionIndex ? 'bg-blue-600 text-white' : ''}
                    ${answer?.selectedOption !== '' && index !== currentQuestionIndex ? 'bg-green-100 text-green-800' : ''}
                    ${answer?.selectedOption === '' && index !== currentQuestionIndex ? 'bg-gray-200 text-gray-800' : ''}
                  `}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <Dialog 
        isOpen={isDialogOpen}
        onClose={closeDialog}
        title="Submit Test"
      >
        {dialogContent}
      </Dialog>
    </div>
  );
};

export default TestPage;