import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { useSupabase } from '../hooks/useSupabase';
import Button from '../components/Button';
import { ArrowLeft, Upload, Eye, EyeOff } from 'lucide-react';

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

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { supabase, user } = useSupabase();
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [testTitle, setTestTitle] = useState<string>('');
  const [timeLimit, setTimeLimit] = useState<number>(20);
  const [csvData, setCsvData] = useState<QuestionRow[]>([]);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if no user is logged in
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setCsvError(null);
    setCsvData([]);

    // Parse CSV with proper type handling
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Validate required columns
        const requiredColumns = ['No.', 'Category', 'Sub-Category', 'Question', 
                                'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Answer'];
        
        const headers = results.meta.fields || [];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          setCsvError(`Missing required columns: ${missingColumns.join(', ')}`);
          return;
        }
        
        // Type assertion to ensure we get the right type
        const parsedData = results.data as QuestionRow[];
        
        // Further validation
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

  const handleSubmit = async (e: React.FormEvent) => {
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

      // Create a new test
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

      // Process questions from CSV data
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

      // Insert questions
      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questions);

      if (questionsError) throw questionsError;

      alert('Test created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating test:', error);
      alert('Error creating test. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center">
          <Button 
            variant="secondary"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="mr-4 flex items-center"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold">Create New Test</h1>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <form onSubmit={handleSubmit}>
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
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-green-600">
                      {csvData.length} questions loaded from CSV
                    </p>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center"
                    >
                      {showPreview ? (
                        <>
                          <EyeOff size={16} className="mr-1" />
                          Hide Preview
                        </>
                      ) : (
                        <>
                          <Eye size={16} className="mr-1" />
                          Preview Data
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {showPreview && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Options</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answer</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {csvData.slice(0, 5).map((row, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{row['No.']}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{row['Category']}</td>
                              <td className="px-3 py-2 text-sm text-gray-500 max-w-xs truncate">{row['Question']}</td>
                              <td className="px-3 py-2 text-sm text-gray-500">{row['Option 1']}, {row['Option 2']}, ...</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{row['Answer']}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvData.length > 5 && (
                        <p className="mt-2 text-xs text-gray-500 text-center">
                          Showing first 5 of {csvData.length} questions
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                isLoading={isUploading} 
                disabled={csvData.length === 0 || !!csvError}
              >
                Create Test
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Admin;