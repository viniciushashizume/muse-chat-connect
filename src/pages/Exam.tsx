import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Clock, AlertTriangle } from "lucide-react";
import { Challenge } from "@/types/challenge";
import { generateChallenges, validateChallengeAnswer, ValidationApiResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Exam() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const area = searchParams.get("area") || "";

  // Tempo limite em segundos (30 minutos = 1800 segundos)
  const EXAM_TIME_LIMIT = 1800;

  const [isLoadingExam, setIsLoadingExam] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [questions, setQuestions] = useState<Challenge[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [validationResults, setValidationResults] = useState<Record<number, ValidationApiResponse>>({});
  const [timeRemaining, setTimeRemaining] = useState(EXAM_TIME_LIMIT);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (examStarted && !examFinished && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Tempo esgotado - submeter automaticamente
            clearInterval(timerRef.current!);
            toast({
              title: "Tempo Esgotado!",
              description: "A prova será submetida automaticamente.",
              variant: "destructive",
            });
            submitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [examStarted, examFinished, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = () => {
    if (timeRemaining <= 60) return "text-destructive";
    if (timeRemaining <= 300) return "text-yellow-600 dark:text-yellow-500";
    return "text-muted-foreground";
  };

  const startExam = async () => {
    if (!area) {
      navigate("/area-selection");
      return;
    }

    setIsLoadingExam(true);
    try {
      const response = await generateChallenges(area);
      if (response.challenges && response.challenges.length > 0) {
        setQuestions(response.challenges);
        setExamStarted(true);
        setCurrentQuestion(0);
        setTimeRemaining(EXAM_TIME_LIMIT); // Reset timer
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível gerar a prova. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar a prova.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingExam(false);
    }
  };

  const handleAnswerChange = (value: string) => {
    setAnswers({ ...answers, [currentQuestion]: value });
  };

  const goToNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const submitExam = async () => {
    setIsSubmittingExam(true);
    const results: Record<number, ValidationApiResponse> = {};

    try {
      // Validate all answers
      for (let i = 0; i < questions.length; i++) {
        const userAnswer = answers[i] || "";
        const validation = await validateChallengeAnswer(questions[i], userAnswer);
        results[i] = validation;
      }

      setValidationResults(results);
      setExamFinished(true);
      toast({
        title: "Prova finalizada!",
        description: "Confira seus resultados abaixo.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao validar as respostas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingExam(false);
    }
  };

  const getCorrectCount = () => {
    return Object.values(validationResults).filter((result) => result.is_correct).length;
  };

  const restartExam = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setExamStarted(false);
    setExamFinished(false);
    setQuestions([]);
    setCurrentQuestion(0);
    setAnswers({});
    setValidationResults({});
    setTimeRemaining(EXAM_TIME_LIMIT);
  };

  if (!area) {
    navigate("/area-selection");
    return null;
  }

  // Exam Results View
  if (examFinished) {
    const correctCount = getCorrectCount();
    const totalQuestions = questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Button
          variant="ghost"
          onClick={restartExam}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Nova Prova
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resultados da Prova</CardTitle>
            <CardDescription>Área: {area}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className="text-4xl font-bold mb-2">
                {correctCount} / {totalQuestions}
              </div>
              <div className="text-muted-foreground mb-4">
                Você acertou {percentage}% das questões
              </div>
              <Progress value={percentage} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {questions.map((question, index) => {
            const result = validationResults[index];
            const userAnswer = answers[index] || "Não respondida";

            return (
              <Card key={question.id} className="border-l-4" style={{
                borderLeftColor: result?.is_correct ? "hsl(var(--success))" : "hsl(var(--destructive))"
              }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {result?.is_correct ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        Questão {index + 1}
                      </CardTitle>
                      <CardDescription className="mt-2">{question.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-semibold text-sm text-muted-foreground mb-1">Sua resposta:</p>
                    {question.type === "multiple-choice" && question.options ? (
                      <p className="text-sm">
                        {question.options.find(opt => opt.id === userAnswer)?.text || userAnswer}
                      </p>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                        {userAnswer}
                      </p>
                    )}
                  </div>

                  {result && (
                    <Alert variant={result.is_correct ? "default" : "destructive"}>
                      <AlertDescription className="text-sm">
                        <strong>Feedback:</strong> {result.feedback}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 flex justify-center">
          <Button onClick={restartExam} size="lg">
            Fazer Nova Prova
          </Button>
        </div>
      </div>
    );
  }

  // Exam in Progress View
  if (examStarted && questions.length > 0) {
    const question = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <div className="container mx-auto p-6 max-w-3xl">
        {/* Timer Alert */}
        {timeRemaining <= 300 && (
          <Alert variant={timeRemaining <= 60 ? "destructive" : "default"} className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {timeRemaining <= 60 
                ? "Atenção! Menos de 1 minuto restante!" 
                : "Atenção! Menos de 5 minutos restantes!"
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Timer Display */}
        <Card className="mb-6 border-2">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className={`h-5 w-5 ${getTimeColor()}`} />
                <span className="text-sm font-medium">Tempo Restante</span>
              </div>
              <div className={`text-2xl font-bold tabular-nums ${getTimeColor()}`}>
                {formatTime(timeRemaining)}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Questão {currentQuestion + 1} de {questions.length}
            </span>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{question.title}</CardTitle>
            <CardDescription>{question.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {question.type === "multiple-choice" && question.options ? (
              <RadioGroup
                value={answers[currentQuestion] || ""}
                onValueChange={handleAnswerChange}
              >
                {question.options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="cursor-pointer">
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <Textarea
                placeholder={
                  question.type === "code"
                    ? "Digite seu código aqui..."
                    : "Digite sua resposta aqui..."
                }
                value={answers[currentQuestion] || ""}
                onChange={(e) => handleAnswerChange(e.target.value)}
                className="min-h-[200px] font-mono"
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={goToPreviousQuestion}
            disabled={currentQuestion === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>

          {currentQuestion === questions.length - 1 ? (
            <Button
              onClick={submitExam}
              disabled={isSubmittingExam}
            >
              {isSubmittingExam ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                "Finalizar Prova"
              )}
            </Button>
          ) : (
            <Button onClick={goToNextQuestion}>
              Próxima
              <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Start Exam View
  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/area-selection")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Prova de Avaliação</CardTitle>
          <CardDescription>Área: {area}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Esta prova consiste em um questionário com questões objetivas, dissertativas e de código.
            Ao final, você verá quantas questões acertou e receberá feedback detalhado do agente de validação.
          </p>
          <Alert>
            <AlertDescription>
              <strong>Instruções:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Responda todas as questões com atenção</li>
                <li>Você pode navegar entre as questões</li>
                <li>Ao finalizar, suas respostas serão validadas automaticamente</li>
              </ul>
            </AlertDescription>
          </Alert>
          <Button
            onClick={startExam}
            disabled={isLoadingExam}
            className="w-full"
            size="lg"
          >
            {isLoadingExam ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando prova...
              </>
            ) : (
              "Iniciar Prova"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
