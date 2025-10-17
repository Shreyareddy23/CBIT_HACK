import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

interface TypingAnalysis {
  summary: {
    totalWords: number;
    overallAccuracy: string;
    completedPhases: string[];
    averageTimePerWord: string;
  };
  dyslexiaPatterns: {
    letterReversals: string[];
    visualConfusions: string[];
    phoneticConfusions: string[];
    persistentChallenges: string[];
  };
  progress: {
    initialPhaseAccuracy: string;
    targetedPhaseAccuracy: string;
    improvement: string;
    areasImproved: string[];
    remainingChallenges: string[];
  };
  recommendations: {
    focusAreas: string[];
    suggestedExercises: string[];
    nextSteps: string[];
  };
}

interface SessionDetails {
  childName: string;
  sessionDate: string;
  phase: string;
  analysis: TypingAnalysis;
}

interface Props {
  sessionId: string;
  therapistCode: string;
}

const TypingAssessmentView: React.FC<Props> = ({ sessionId, therapistCode }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionDetails | null>(null);

  useEffect(() => {
    fetchSessionAnalysis();
  }, [sessionId, therapistCode]);

  const fetchSessionAnalysis = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/typing/therapist-analysis/${sessionId}?therapistCode=${therapistCode}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSessionData(data);
      } else {
        throw new Error(data.error || 'Failed to fetch analysis');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingContainer>Loading analysis...</LoadingContainer>;
  if (error) return <ErrorMessage>{error}</ErrorMessage>;
  if (!sessionData) return <ErrorMessage>No data available</ErrorMessage>;

  return (
    <Container>
      <Header>
        <Title>Typing Assessment Analysis</Title>
        <SubTitle>
          {sessionData.childName} - {new Date(sessionData.sessionDate).toLocaleDateString()}
        </SubTitle>
        <PhaseIndicator phase={sessionData.phase}>
          Phase: {sessionData.phase.toUpperCase()}
        </PhaseIndicator>
      </Header>

      <Section>
        <SectionTitle>Summary</SectionTitle>
        <SummaryGrid>
          <SummaryItem>
            <Label>Total Words</Label>
            <Value>{sessionData.analysis.summary.totalWords}</Value>
          </SummaryItem>
          <SummaryItem>
            <Label>Overall Accuracy</Label>
            <Value>{sessionData.analysis.summary.overallAccuracy}</Value>
          </SummaryItem>
          <SummaryItem>
            <Label>Average Time per Word</Label>
            <Value>{sessionData.analysis.summary.averageTimePerWord}</Value>
          </SummaryItem>
        </SummaryGrid>
      </Section>

      <Section>
        <SectionTitle>Dyslexia Patterns</SectionTitle>
        <PatternsList>
          <PatternItem>
            <PatternLabel>Letter Reversals:</PatternLabel>
            <TagList>
              {sessionData.analysis.dyslexiaPatterns.letterReversals.map((item, idx) => (
                <Tag key={idx} type="warning">{item}</Tag>
              ))}
            </TagList>
          </PatternItem>
          <PatternItem>
            <PatternLabel>Visual Confusions:</PatternLabel>
            <TagList>
              {sessionData.analysis.dyslexiaPatterns.visualConfusions.map((item, idx) => (
                <Tag key={idx} type="info">{item}</Tag>
              ))}
            </TagList>
          </PatternItem>
          <PatternItem>
            <PatternLabel>Phonetic Confusions:</PatternLabel>
            <TagList>
              {sessionData.analysis.dyslexiaPatterns.phoneticConfusions.map((item, idx) => (
                <Tag key={idx} type="error">{item}</Tag>
              ))}
            </TagList>
          </PatternItem>
        </PatternsList>
      </Section>

      <Section>
        <SectionTitle>Progress Analysis</SectionTitle>
        <ProgressGrid>
          <ProgressItem>
            <ProgressLabel>Initial Phase Accuracy</ProgressLabel>
            <ProgressValue>{sessionData.analysis.progress.initialPhaseAccuracy}</ProgressValue>
          </ProgressItem>
          <ProgressItem>
            <ProgressLabel>Targeted Phase Accuracy</ProgressLabel>
            <ProgressValue>{sessionData.analysis.progress.targetedPhaseAccuracy}</ProgressValue>
          </ProgressItem>
          <ProgressItem>
            <ProgressLabel>Improvement</ProgressLabel>
            <ProgressValue positive={parseFloat(sessionData.analysis.progress.improvement) > 0}>
              {sessionData.analysis.progress.improvement}
            </ProgressValue>
          </ProgressItem>
        </ProgressGrid>

        <SubSection>
          <SubTitle>Areas of Improvement</SubTitle>
          <TagList>
            {sessionData.analysis.progress.areasImproved.map((area, idx) => (
              <Tag key={idx} type="success">{area}</Tag>
            ))}
          </TagList>
        </SubSection>

        <SubSection>
          <SubTitle>Remaining Challenges</SubTitle>
          <TagList>
            {sessionData.analysis.progress.remainingChallenges.map((challenge, idx) => (
              <Tag key={idx} type="warning">{challenge}</Tag>
            ))}
          </TagList>
        </SubSection>
      </Section>

      <Section>
        <SectionTitle>Recommendations</SectionTitle>
        <RecommendationsList>
          <RecommendationGroup>
            <GroupTitle>Focus Areas</GroupTitle>
            <List>
              {sessionData.analysis.recommendations.focusAreas.map((area, idx) => (
                <ListItem key={idx}>{area}</ListItem>
              ))}
            </List>
          </RecommendationGroup>

          <RecommendationGroup>
            <GroupTitle>Suggested Exercises</GroupTitle>
            <List>
              {sessionData.analysis.recommendations.suggestedExercises.map((exercise, idx) => (
                <ListItem key={idx}>{exercise}</ListItem>
              ))}
            </List>
          </RecommendationGroup>

          <RecommendationGroup>
            <GroupTitle>Next Steps</GroupTitle>
            <List>
              {sessionData.analysis.recommendations.nextSteps.map((step, idx) => (
                <ListItem key={idx}>{step}</ListItem>
              ))}
            </List>
          </RecommendationGroup>
        </RecommendationsList>
      </Section>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Header = styled.div`
  margin-bottom: 32px;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 28px;
  color: #2c3e50;
  margin: 0 0 8px 0;
`;

const SubTitle = styled.h2`
  font-size: 18px;
  color: #7f8c8d;
  margin: 0 0 16px 0;
  font-weight: normal;
`;

const PhaseIndicator = styled.div<{ phase: string }>`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 600;
  background: ${props => {
    switch (props.phase) {
      case 'initial': return '#e3f2fd';
      case 'targeted': return '#f0f4c3';
      case 'complete': return '#e8f5e9';
      default: return '#f5f5f5';
    }
  }};
  color: ${props => {
    switch (props.phase) {
      case 'initial': return '#1976d2';
      case 'targeted': return '#afb42b';
      case 'complete': return '#388e3c';
      default: return '#616161';
    }
  }};
`;

const Section = styled.section`
  margin-bottom: 32px;
  padding: 24px;
  background: #f8f9fa;
  border-radius: 8px;
`;

const SectionTitle = styled.h3`
  font-size: 20px;
  color: #2c3e50;
  margin: 0 0 20px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e9ecef;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const SummaryItem = styled.div`
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const Label = styled.div`
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 4px;
`;

const Value = styled.div`
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
`;

const PatternsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const PatternItem = styled.div`
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const PatternLabel = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
`;

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Tag = styled.span<{ type: 'success' | 'warning' | 'error' | 'info' }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => {
    switch (props.type) {
      case 'success': return '#e8f5e9';
      case 'warning': return '#fff3e0';
      case 'error': return '#ffebee';
      case 'info': return '#e3f2fd';
      default: return '#f5f5f5';
    }
  }};
  color: ${props => {
    switch (props.type) {
      case 'success': return '#2e7d32';
      case 'warning': return '#f57c00';
      case 'error': return '#c62828';
      case 'info': return '#1565c0';
      default: return '#616161';
    }
  }};
`;

const ProgressGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const ProgressItem = styled.div`
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const ProgressLabel = styled.div`
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 4px;
`;

const ProgressValue = styled.div<{ positive?: boolean }>`
  font-size: 24px;
  font-weight: 600;
  color: ${props => props.positive ? '#2e7d32' : '#c62828'};
`;

const SubSection = styled.div`
  margin-top: 24px;
`;

const SubSectionTitle = styled.h4`
  font-size: 16px;
  color: #2c3e50;
  margin: 0 0 12px 0;
`;

// Rename SubTitle to SectionSubTitle to avoid collision
const SectionSubTitle = styled.h4`
  font-size: 16px;
  color: #2c3e50;
  margin: 0 0 12px 0;
`;

const RecommendationsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
`;

const RecommendationGroup = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const GroupTitle = styled.h5`
  font-size: 16px;
  color: #2c3e50;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
`;

const List = styled.ul`
  margin: 0;
  padding-left: 20px;
`;

const ListItem = styled.li`
  color: #495057;
  margin-bottom: 8px;
  line-height: 1.5;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 18px;
  color: #6c757d;
`;

const ErrorMessage = styled.div`
  padding: 16px;
  background: #ffebee;
  color: #c62828;
  border-radius: 8px;
  text-align: center;
  margin: 20px 0;
`;

export default TypingAssessmentView;