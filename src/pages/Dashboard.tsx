import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabase } from '../hooks/useSupabase';
import Button from '../components/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/Card';
import Dialog from '../components/Dialog';
import Papa from 'papaparse';
import { LogOut, Plus, Trash2, Upload } from 'lucide-react';

interface Test {
  test_id: string;
  title: string;
  time_limit: number;
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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
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

        const { data: testsData, error: testsError } = await supabase
          .from('tests')
          .select(`
            test_id,
            title,
            time_limit,
            created_at,
            created_by,
            users(name)
          `)
          .order('created_at', { ascending: false });

        if (testsError) throw testsError;

        const formattedTests = (testsData || []).map(test => ({
          test_id: test.test_id,
          title: test.title,
          time_limit: test.time_limit,
          created_at: test.created_at,
          created_by: test.created_by,
          creator_name: (test.users && test.users[0]?.name) || 'Unknown User'
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

      const { error: questionsError } = await supabase
        .from('questions')
        .delete()
        .eq('test_id', testId);

      if (questionsError) throw questionsError;

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
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteTest(test.test_id)}
                          isLoading={deletingTestId === test.test_id}
                          className="flex items-center"
                        >
                          <Trash2 size={14} />
                        </Button>
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
      </main>
    </div>
  );
};

export default Dashboard;