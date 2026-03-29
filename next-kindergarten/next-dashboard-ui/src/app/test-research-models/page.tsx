'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  BarChart3, 
  GitBranch, 
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function TestResearchModelsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [testType, setTestType] = useState('all');
  const [customIds, setCustomIds] = useState({
    studentId: '',
    topicId: '',
    classId: '',
  });

  const runTests = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      const params = new URLSearchParams({ test: testType });
      if (customIds.studentId) params.append('studentId', customIds.studentId);
      if (customIds.topicId) params.append('topicId', customIds.topicId);
      if (customIds.classId) params.append('classId', customIds.classId);

      const response = await fetch(`/api/research-test?${params}`);
      const data = await response.json();
      setResults(data);
    } catch (error: any) {
      setResults({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const testOptions = [
    { value: 'all', label: 'All Models', icon: Sparkles },
    { value: 'lambda', label: 'Personalized λ', icon: Brain },
    { value: 'tvi', label: 'Topic Volatility', icon: BarChart3 },
    { value: 'cis', label: 'Composite Intelligence', icon: Target },
    { value: 'irt', label: 'Item Response Theory', icon: GitBranch },
    { value: 'bkt', label: 'Bayesian Knowledge', icon: Activity },
    { value: 'stats', label: 'Statistical Testing', icon: TrendingUp },
    { value: 'trends', label: 'Longitudinal Trends', icon: Activity },
  ];

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBg = (success: boolean) => {
    return success ? 'bg-green-50' : 'bg-red-50';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🧮 Research-Grade Models Test Lab</h1>
          <p className="text-gray-600">
            Test all 7 mathematical models directly from your browser
          </p>
        </div>

        {/* Control Panel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Test Type Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Select Test</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {testOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant={testType === option.value ? 'default' : 'outline'}
                      onClick={() => setTestType(option.value)}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Custom IDs (Optional) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Student ID (optional)</label>
                <Input
                  placeholder="Auto-detected if empty"
                  value={customIds.studentId}
                  onChange={(e) => setCustomIds({ ...customIds, studentId: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Topic ID (optional)</label>
                <Input
                  placeholder="Auto-detected if empty"
                  value={customIds.topicId}
                  onChange={(e) => setCustomIds({ ...customIds, topicId: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Class ID (optional)</label>
                <Input
                  placeholder="Auto-detected if empty"
                  value={customIds.classId}
                  onChange={(e) => setCustomIds({ ...customIds, classId: e.target.value })}
                />
              </div>
            </div>

            {/* Run Button */}
            <Button 
              onClick={runTests} 
              disabled={loading}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Run {testType === 'all' ? 'All Tests' : 'Selected Test'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {/* Summary */}
            {results.success && results.results && (
              <Card className={results.results.dataStats?.hasEnoughData ? 'border-green-500' : 'border-orange-500'}>
                <CardHeader>
                  <CardTitle>Test Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {results.results.dataStats?.totalAttempts || 0}
                      </div>
                      <div className="text-sm text-gray-600">Quiz Attempts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {results.results.dataStats?.totalStudents || 0}
                      </div>
                      <div className="text-sm text-gray-600">Students</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {results.results.summary?.testsSucceeded || 0}
                      </div>
                      <div className="text-sm text-gray-600">Tests Passed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        {results.results.summary?.successRate || '0%'}
                      </div>
                      <div className="text-sm text-gray-600">Success Rate</div>
                    </div>
                  </div>

                  {!results.results.dataStats?.hasEnoughData && (
                    <div className="bg-orange-50 p-4 rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-900">Limited Data Available</p>
                        <p className="text-sm text-orange-700">
                          For best results, you need at least 10 quiz attempts from 3+ students.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Individual Test Results */}
            {results.results?.tests && Object.entries(results.results.tests).map(([key, test]: [string, any]) => (
              <Card key={key} className={test.success ? 'border-green-500' : 'border-red-500'}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {test.success ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600" />
                      )}
                      <div>
                        <CardTitle>{test.model || key}</CardTitle>
                        {test.success && (
                          <p className="text-sm text-gray-600 mt-1">✅ Working correctly</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {test.success ? (
                    <div className="space-y-4">
                      {/* Lambda-specific display */}
                      {key === 'personalizedLambda' && test.data && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className={`p-4 rounded-lg ${getStatusBg(true)}`}>
                            <div className="text-sm text-gray-600">Personal λ</div>
                            <div className="text-2xl font-bold">{test.data.lambda?.toFixed(4)}</div>
                          </div>
                          <div className={`p-4 rounded-lg ${getStatusBg(true)}`}>
                            <div className="text-sm text-gray-600">Forgetting Speed</div>
                            <div className="text-2xl font-bold capitalize">{test.data.classification}</div>
                          </div>
                          <div className={`p-4 rounded-lg ${getStatusBg(true)}`}>
                            <div className="text-sm text-gray-600">Days Until Decay</div>
                            <div className="text-2xl font-bold">{test.data.daysUntilDecay || 'N/A'}</div>
                          </div>
                        </div>
                      )}

                      {/* TVI-specific display */}
                      {key === 'topicVolatility' && test.data && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className={`p-4 rounded-lg ${getStatusBg(true)}`}>
                            <div className="text-sm text-gray-600">TVI</div>
                            <div className="text-2xl font-bold">{test.data.tvi?.toFixed(3)}</div>
                          </div>
                          <div className={`p-4 rounded-lg ${getStatusBg(true)}`}>
                            <div className="text-sm text-gray-600">Stability</div>
                            <div className="text-2xl font-bold capitalize">{test.data.stability}</div>
                          </div>
                          <div className={`p-4 rounded-lg ${getStatusBg(true)}`}>
                            <div className="text-sm text-gray-600">Mean Score</div>
                            <div className="text-2xl font-bold">{(test.data.mean * 100)?.toFixed(1)}%</div>
                          </div>
                          <div className={`p-4 rounded-lg ${getStatusBg(true)}`}>
                            <div className="text-sm text-gray-600">Std Dev</div>
                            <div className="text-2xl font-bold">{(test.data.stdDev * 100)?.toFixed(1)}%</div>
                          </div>
                        </div>
                      )}

                      {/* CIS-specific display */}
                      {key === 'compositeIntelligence' && test.data && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-6">
                            <div className={`p-6 rounded-lg ${getStatusBg(true)}`}>
                              <div className="text-sm text-gray-600">CIS Score</div>
                              <div className="text-4xl font-bold">{(test.data.cis * 100)?.toFixed(1)}%</div>
                            </div>
                            <div className={`p-6 rounded-lg ${getStatusBg(true)}`}>
                              <div className="text-sm text-gray-600">Grade</div>
                              <div className="text-4xl font-bold">{test.data.grade}</div>
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-700">{test.data.interpretation}</p>
                            </div>
                          </div>
                          {test.data.actionItems && test.data.actionItems.length > 0 && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <p className="font-semibold text-blue-900 mb-2">Action Items:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {test.data.actionItems.map((item: string, idx: number) => (
                                  <li key={idx} className="text-blue-800">{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Generic JSON display for other tests */}
                      {!['personalizedLambda', 'topicVolatility', 'compositeIntelligence'].includes(key) && (
                        <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-xs">
                          {JSON.stringify(test.data, null, 2)}
                        </pre>
                      )}

                      {test.data?.interpretation && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-blue-900">{test.data.interpretation}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`p-4 rounded-lg ${getStatusBg(false)}`}>
                      <p className="font-medium text-red-900 mb-2">❌ {test.error || 'Test failed'}</p>
                      {test.requirement && (
                        <p className="text-sm text-red-700">
                          <strong>Requirement:</strong> {test.requirement}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Error Display */}
            {!results.success && (
              <Card className="border-red-500">
                <CardHeader>
                  <CardTitle className="text-red-600">Error</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-700">{results.error}</p>
                  {results.results?.error && (
                    <p className="text-sm text-gray-600 mt-2">{results.results.error}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Instructions */}
        {!results && (
          <Card>
            <CardHeader>
              <CardTitle>📖 How to Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">1. Select Test Type</h3>
                <p className="text-sm text-gray-600">
                  Choose "All Models" to test everything, or pick individual models to test specific features.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">2. Optional: Enter Custom IDs</h3>
                <p className="text-sm text-gray-600">
                  Leave blank to auto-detect from database, or paste specific student/topic/class IDs.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">3. Click "Run Tests"</h3>
                <p className="text-sm text-gray-600">
                  The system will test all selected mathematical models and show detailed results.
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-900">
                  <strong>⚠️ Note:</strong> You need quiz data in your database for meaningful results. 
                  If you see "insufficient data" errors, create some quiz attempts first.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
