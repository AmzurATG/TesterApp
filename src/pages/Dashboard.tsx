import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../hooks/useSupabase';
import Button from '../components/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/Card';
import Dialog from '../components/Dialog';
import Papa from 'papaparse';
import { LogOut, Plus, Trash2, Upload, Settings, FileSpreadsheet } from 'lucide-react';

interface Test {
  test_id: string;
  title: string;
  time_limit: number;
  questions_count?: number;
  created_at: string;
  created_by: string;
  creator_name?: string;
}

interface QuestionRow {
  'No.': string;
  'Category': string;
  'Sub-Category': string;
  'Question': string;
  'Option 1': string;
  'Option 2': string;
  'Option 3': string;
  'Option 4': string;
  'Answer': string;
}

interface TestAttempt {
  attempt_id: string;
  user_id: string;
  test_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  completed_at: string;
  user_email?: string;
  user_name?: string;
}

const Dashboard: React.FC = () => {
  const { supabase, user, signOut } = useSupabase();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [signingOut, setSigningOut] = useState<boolean>(false);
  const [deletingTestId, setDeletingTestId] = useState<string | null>(null);

  // Test creation state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
  const [testTitle, setTestTitle] = useState<string>('');
  const [timeLimit, setTimeLimit] = useState<number>(20);
  const [csvData, setCsvData] = useState<QuestionRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Test configuration state
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState<boolean>(false);
  const [configTestId, setConfigTestId] = useState<string | null>(null);
  const [configTestTitle, setConfigTestTitle] = useState<string>('');
  const [configTimeLimit, setConfigTimeLimit] = useState<number>(20);
  const [configQuestionsCount, setConfigQuestionsCount] = useState<number>(10);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Test attempts state
  const [isAttemptsDialogOpen, setIsAttemptsDialogOpen] = useState<boolean>(false);
  const [selectedTestAttempts, setSelectedTestAttempts] = useState<TestAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState<boolean>(false);
  const [selectedTestTitle, setSelectedTestTitle] = useState<string>('');

  useEffect(() => {
    const fetchUserAndTests = async () => {
      try {
        setLoading(true);

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (profileError) {
            if (profileError.code === 'PGRST116') {
              const { data: newProfile, error: insertError } = await supabase
                .from('users')
                .insert({
                  user_id: user.id,
                  email: user.email,
                  name: user.user_metadata?.name || 'User',
                  avatar_url: user.user_metadata?.avatar_url || null,
                  role: 'user'
                })
                .select()
                .single();

              if (!insertError) setUserProfile(newProfile);
              else console.error('Failed to create user profile:', insertError);
            } else {
              console.error('Error fetching user profile:', profileError);
            }
          } else {
            setUserProfile(profile);
          }
        }

        // Updated query to properly join with users table
        const { data: testsData, error: testsError } = await supabase
          .from('tests')
          .select(`
            *,
            users:created_by(name)
          `)
          .order('created_at', { ascending: false });

        if (testsError) throw testsError;

        const formattedTests = (testsData || []).map(test => ({
          test_id: test.test_id,
          title: test.title,
          time_limit: test.time_limit,
          questions_count: test.questions_count,
          created_at: test.created_at,
          created_by: test.created_by,
          creator_name: test.users?.name || 'Unknown User'
        }));

        setTests(formattedTests);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndTests();
  }, [supabase, user]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    setCsvData([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const requiredColumns = ['No.', 'Category', 'Sub-Category', 'Question', 
                              'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Answer'];

        const headers = results.meta.fields || [];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));

        if (missingColumns.length > 0) {
          setCsvError(`Missing required columns: ${missingColumns.join(', ')}`);
          return;
        }

        const parsedData = results.data as QuestionRow[];

        if (parsedData.length === 0) {
          setCsvError('CSV file contains no data');
          return;
        }

        setCsvData(parsedData);
      },
      error: (error) => {
        console.error('Error parsing CSV file', error);
        setCsvError('Error parsing CSV file. Please check the format.');
      }
    });
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (csvData.length === 0) {
      alert('Please upload a CSV file with questions');
      return;
    }

    if (!testTitle.trim()) {
      alert('Please enter a test title');
      return;
    }

    try {
      setIsUploading(true);

      const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert({
          title: testTitle,
          time_limit: timeLimit,
          created_by: user?.id
        })
        .select()
        .single();

      if (testError) throw testError;

      const questions = csvData.map((row: QuestionRow) => {
        const options = [row['Option 1'], row['Option 2'], row['Option 3'], row['Option 4']];
        return {
          test_id: testData.test_id,
          category: row.Category,
          sub_category: row['Sub-Category'],
          question_text: row.Question,
          options: JSON.stringify(options),
          correct_answer: row.Answer
        };
      });

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questions);

      if (questionsError) throw questionsError;

      const newTest: Test = {
        test_id: testData.test_id,
        title: testData.title,
        time_limit: testData.time_limit,
        created_at: testData.created_at,
        created_by: testData.created_by,
        creator_name: userProfile?.name || 'Unknown User'
      };

      setTests([newTest, ...tests]);

      setTestTitle('');
      setTimeLimit(20);
      setCsvData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setIsCreateDialogOpen(false);

      alert('Test created successfully!');
    } catch (error) {
      console.error('Error creating test:', error);
      alert('Error creating test. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetCreateForm = () => {
    setTestTitle('');
    setTimeLimit(20);
    setCsvData([]);
    setCsvError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!window.confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingTestId(testId);

      // First delete test results/attempts if they exist
      const { error: resultsError } = await supabase
        .from('test_results')
        .delete()
        .eq('test_id', testId);

      if (resultsError) {
        console.error('Error deleting test results:', resultsError);
        // Continue with deletion even if there's an error with results
        // as they might not exist
      }

      // Then delete test attempts if they exist
      const { error: attemptsError } = await supabase
        .from('test_attempts')
        .delete()
        .eq('test_id', testId);

      if (attemptsError) {
        console.error('Error deleting test attempts:', attemptsError);
        // Continue with deletion even if there's an error with attempts
        // as they might not exist
      }

      // Delete questions
      const { error: questionsError } = await supabase
        .from('questions')
        .delete()
        .eq('test_id', testId);

      if (questionsError) throw questionsError;

      // Finally delete the test
      const { error: testError } = await supabase
        .from('tests')
        .delete()
        .eq('test_id', testId);

      if (testError) throw testError;

      setTests(tests.filter(test => test.test_id !== testId));

    } catch (error) {
      console.error('Error deleting test:', error);
      alert('Error deleting test. Please try again.');
    } finally {
      setDeletingTestId(null);
    }
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Error signing out. Please try again.');
      setSigningOut(false);
    }
  };

  const handleUpdateTest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!configTestId) return;

    try {
      setIsUpdating(true);

      const { error: testError } = await supabase
        .from('tests')
        .update({
          title: configTestTitle,
          time_limit: configTimeLimit,
          questions_count: configQuestionsCount
        })
        .eq('test_id', configTestId);

      if (testError) throw testError;

      setTests(tests.map(test => 
        test.test_id === configTestId 
          ? { ...test, title: configTestTitle, time_limit: configTimeLimit, questions_count: configQuestionsCount }
          : test
      ));

      setIsConfigDialogOpen(false);
      alert('Test updated successfully!');
    } catch (error) {
      console.error('Error updating test:', error);
      alert('Error updating test. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewAttempts = async (testId: string, testTitle: string) => {
    try {
      setLoadingAttempts(true);
      setSelectedTestTitle(testTitle);

      const { data: attempts, error } = await supabase
        .from('attempts')
        .select(`
          *,
          users:user_id (
            email,
            name
          )
        `)
        .eq('test_id', testId)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const formattedAttempts = attempts.map(attempt => ({
        ...attempt,
        user_email: attempt.users?.email,
        user_name: attempt.users?.name
      }));

      setSelectedTestAttempts(formattedAttempts);
      setIsAttemptsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching attempts:', error);
      alert('Error loading test attempts');
    } finally {
      setLoadingAttempts(false);
    }
  };

  if (loading || signingOut) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-100">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">Test Dashboard</h1>
          <div className="flex items-center">
            {userProfile && (
              <span className="mr-4">{userProfile.name}</span>
            )}
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleSignOut}
              className="flex items-center"
            >
              <LogOut size={16} className="mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Available Tests</h2>
          <Button 
            onClick={() => {
              resetCreateForm();
              setIsCreateDialogOpen(true);
            }} 
            className="flex items-center"
          >
            <Plus size={16} className="mr-1" />
            Create New Test
          </Button>
        </div>

        {tests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tests available at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map((test) => (
              <Card key={test.test_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>
                    <div className="flex justify-between items-center">
                      <span>{test.title}</span>
                      {test.created_by === user?.id && (
                        <div className="flex space-x-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex items-center"
                            onClick={() => handleViewAttempts(test.test_id, test.title)}
                            isLoading={loadingAttempts}
                          >
                            <FileSpreadsheet size={14} />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex items-center"
                            onClick={() => {
                              setConfigTestId(test.test_id);
                              setConfigTestTitle(test.title);
                              setConfigTimeLimit(test.time_limit);
                              setConfigQuestionsCount(test.questions_count || 10);
                              setIsConfigDialogOpen(true);
                            }}
                          >
                            <Settings size={14} />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteTest(test.test_id)}
                            isLoading={deletingTestId === test.test_id}
                            className="flex items-center"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-1 text-sm text-gray-500">
                    Time limit: {test.time_limit} minutes
                  </p>
                  <p className="mb-3 text-xs text-gray-400">
                    Created by: {test.creator_name}
                  </p>
                  <div className="mt-4">
                    <Link to={`/test/${test.test_id}`}>
                      <Button size="sm">Start Test</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Test Creation Dialog */}
        <Dialog 
          isOpen={isCreateDialogOpen} 
          onClose={() => setIsCreateDialogOpen(false)}
          title="Create New Test"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateTest}>
            <div className="mb-4">
              <label htmlFor="testTitle" className="block text-sm font-medium text-gray-700 mb-1">
                Test Title
              </label>
              <input
                id="testTitle"
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700 mb-1">
                Time Limit (minutes)
              </label>
              <input
                id="timeLimit"
                type="number"
                min="1"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Questions (CSV)
              </label>
              <div className="mt-1 flex flex-col items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer font-medium text-blue-600 hover:text-blue-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        ref={fileInputRef}
                        name="file-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    CSV with columns: No., Category, Sub-Category, Question, Option 1, Option 2, Option 3, Option 4, Answer
                  </p>
                </div>
              </div>
              
              {csvError && (
                <p className="mt-2 text-sm text-red-600">
                  {csvError}
                </p>
              )}
              
              {csvData.length > 0 && (
                <p className="mt-2 text-sm text-green-600">
                  {csvData.length} questions loaded from CSV
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                isLoading={isUploading} 
                disabled={csvData.length === 0 || !!csvError}
              >
                Create Test
              </Button>
            </div>
          </form>
        </Dialog>

        {/* Test Configuration Dialog */}
        <Dialog 
          isOpen={isConfigDialogOpen} 
          onClose={() => setIsConfigDialogOpen(false)}
          title="Configure Test"
          maxWidth="lg"
        >
          <form onSubmit={handleUpdateTest}>
            <div className="mb-4">
              <label htmlFor="configTestTitle" className="block text-sm font-medium text-gray-700 mb-1">
                Test Title
              </label>
              <input
                id="configTestTitle"
                type="text"
                value={configTestTitle}
                onChange={(e) => setConfigTestTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="configTimeLimit" className="block text-sm font-medium text-gray-700 mb-1">
                Time Limit (minutes)
              </label>
              <input
                id="configTimeLimit"
                type="number"
                min="1"
                value={configTimeLimit}
                onChange={(e) => setConfigTimeLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="configQuestionsCount" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Questions
              </label>
              <input
                id="configQuestionsCount"
                type="number"
                min="1"
                value={configQuestionsCount}
                onChange={(e) => setConfigQuestionsCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setIsConfigDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                isLoading={isUpdating}
              >
                Update Test
              </Button>
            </div>
          </form>
        </Dialog>

        {/* Test Attempts Dialog */}
        <Dialog 
          isOpen={isAttemptsDialogOpen} 
          onClose={() => setIsAttemptsDialogOpen(false)}
          title={`Test Attempts - ${selectedTestTitle}`}
          maxWidth="xl"
        >
          <div className="overflow-x-auto">
            {selectedTestAttempts.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No attempts yet</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="w-1/3 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th scope="col" className="w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th scope="col" className="w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                    <th scope="col" className="w-1/3 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed At</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedTestAttempts.map((attempt) => (
                    <tr key={attempt.attempt_id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>
                          <p className="font-medium">{attempt.user_name || 'Unknown User'}</p>
                          <p className="text-gray-500 text-xs">{attempt.user_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {attempt.score}/{attempt.total_questions}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {attempt.percentage.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {new Date(attempt.completed_at).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button 
              variant="secondary" 
              onClick={() => setIsAttemptsDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </Dialog>
      </main>
    </div>
  );
};

export default Dashboard;