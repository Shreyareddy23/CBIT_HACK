import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import TypingAssessmentView from './TypingAssessmentView';

interface ChildSession {
  sessionId: string;
  date: string;
  phase: string;
  typingResults: Array<{
    word: string;
    input: string;
    correct: boolean;
    completedAt: string;
  }>;
}

interface Child {
  username: string;
  sessions: ChildSession[];
}

const TherapistTypingDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [therapistCode, setTherapistCode] = useState<string>('');

  useEffect(() => {
    // Get therapist code from session storage
    const storedTherapist = sessionStorage.getItem('therapistData');
    if (storedTherapist) {
      const { code } = JSON.parse(storedTherapist);
      setTherapistCode(code);
      fetchChildren(code);
    }
  }, []);

  const fetchChildren = async (code: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/get-therapist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (response.ok) {
        setChildren(data.children || []);
      } else {
        throw new Error(data.error || 'Failed to fetch children');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingContainer>Loading dashboard...</LoadingContainer>;
  if (error) return <ErrorMessage>{error}</ErrorMessage>;

  const selectedChildData = selectedChild 
    ? children.find(c => c.username === selectedChild)
    : null;

  return (
    <Container>
      <Sidebar>
        <SidebarHeader>Children</SidebarHeader>
        <ChildList>
          {children.map(child => (
            <ChildItem
              key={child.username}
              selected={selectedChild === child.username}
              onClick={() => {
                setSelectedChild(child.username);
                setSelectedSession(null);
              }}
            >
              {child.username}
              <SessionCount>
                {child.sessions.filter(s => s.typingResults?.length > 0).length} typing sessions
              </SessionCount>
            </ChildItem>
          ))}
        </ChildList>
      </Sidebar>

      <MainContent>
        {selectedChild ? (
          <>
            <Header>
              <Title>Typing Assessment Dashboard</Title>
              <SubTitle>Child: {selectedChild}</SubTitle>
            </Header>

            {selectedChildData && (
              <SessionList>
                <SectionTitle>Typing Sessions</SectionTitle>
                <SessionGrid>
                  {selectedChildData.sessions
                    .filter(session => session.typingResults?.length > 0)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(session => (
                      <SessionCard
                        key={session.sessionId}
                        selected={selectedSession === session.sessionId}
                        onClick={() => setSelectedSession(session.sessionId)}
                      >
                        <SessionDate>
                          {new Date(session.date).toLocaleDateString()}
                        </SessionDate>
                        <SessionDetails>
                          <SessionStat>
                            Words: {session.typingResults.length}
                          </SessionStat>
                          <SessionStat>
                            Accuracy: {
                              Math.round(
                                (session.typingResults.filter(r => r.correct).length / 
                                session.typingResults.length) * 100
                              )}%
                          </SessionStat>
                        </SessionDetails>
                        <SessionPhase phase={session.phase}>
                          {session.phase}
                        </SessionPhase>
                      </SessionCard>
                    ))}
                </SessionGrid>
              </SessionList>
            )}

            {selectedSession && therapistCode && (
              <TypingAssessmentView
                sessionId={selectedSession}
                therapistCode={therapistCode}
              />
            )}
          </>
        ) : (
          <WelcomeMessage>
            👈 Select a child to view their typing assessment results
          </WelcomeMessage>
        )}
      </MainContent>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  min-height: 100vh;
  background: #f8f9fa;
`;

const Sidebar = styled.div`
  width: 300px;
  background: white;
  padding: 24px;
  border-right: 1px solid #e9ecef;
`;

const SidebarHeader = styled.h2`
  font-size: 20px;
  color: #2c3e50;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #e9ecef;
`;

const ChildList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ChildItem = styled.div<{ selected: boolean }>`
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  background: ${props => props.selected ? '#e3f2fd' : 'white'};
  border: 1px solid ${props => props.selected ? '#90caf9' : '#e9ecef'};
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.selected ? '#e3f2fd' : '#f8f9fa'};
  }
`;

const SessionCount = styled.div`
  font-size: 12px;
  color: #6c757d;
  margin-top: 4px;
`;

const MainContent = styled.div`
  flex: 1;
  padding: 32px;
  overflow-y: auto;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 28px;
  color: #2c3e50;
  margin: 0 0 8px 0;
`;

const SubTitle = styled.h2`
  font-size: 18px;
  color: #7f8c8d;
  margin: 0;
  font-weight: normal;
`;

const SessionList = styled.div`
  margin-bottom: 32px;
`;

const SectionTitle = styled.h3`
  font-size: 20px;
  color: #2c3e50;
  margin: 0 0 20px 0;
`;

const SessionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
`;

const SessionCard = styled.div<{ selected: boolean }>`
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  cursor: pointer;
  border: 2px solid ${props => props.selected ? '#90caf9' : 'transparent'};
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
`;

const SessionDate = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
`;

const SessionDetails = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const SessionStat = styled.div`
  font-size: 14px;
  color: #6c757d;
`;

const SessionPhase = styled.div<{ phase: string }>`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
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

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 18px;
  color: #6c757d;
`;

const ErrorMessage = styled.div`
  padding: 16px;
  background: #ffebee;
  color: #c62828;
  border-radius: 8px;
  text-align: center;
  margin: 20px;
`;

const WelcomeMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  font-size: 20px;
  color: #6c757d;
  text-align: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

export default TherapistTypingDashboard;