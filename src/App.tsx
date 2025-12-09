import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Share2, Check, Clock, Send, User, Eye, EyeOff, X } from 'lucide-react';
import { api } from './api';
import { resizeAndConvertToBase64 } from './utils/imageUtils';

export default function EventMatchingApp() {
  const [view, setView] = useState('home');
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // イベントのステータスを判定する関数
  const getEventStatus = (event) => {
    if (!event) return 'open';

    // 締切日が設定されていて、現在時刻が締切を過ぎている場合
    if (event.deadline) {
      const now = new Date();
      const deadline = new Date(event.deadline);
      if (now > deadline) {
        return 'closed';
      }
    }

    // 定員に達している場合
    const selectedCount = event.selectedApplicants?.length || 0;
    if (event.maxParticipants !== 21 && selectedCount >= event.maxParticipants) {
      return 'closed';
    }

    return event.status || 'open';
  };

  useEffect(() => {
    const link1 = document.createElement('link');
    link1.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap';
    link1.rel = 'stylesheet';
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.href = 'https://fonts.cdnfonts.com/css/elns-sans';
    link2.rel = 'stylesheet';
    document.head.appendChild(link2);

    const style = document.createElement('style');
    style.textContent = `
      input::placeholder, textarea::placeholder {
        color: #E6E4DE !important;
        opacity: 1;
      }
    `;
    document.head.appendChild(style);

    // 認証状態をチェック
    checkAuth();

    loadData();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('認証チェックエラー:', error);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleRegister = async (userData) => {
    try {
      const { user } = await api.register(userData);
      setCurrentUser(user);
      setView('home');
    } catch (error) {
      console.error('登録エラー:', error);
      throw error;
    }
  };

  const handleLogin = async (credentials) => {
    try {
      const { user } = await api.login(credentials);
      setCurrentUser(user);
      setView('home');
    } catch (error) {
      console.error('ログインエラー:', error);
      throw error;
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setView('home');
  };

  const handleResetPassword = async (email, newPassword) => {
    try {
      await api.resetPassword(email, newPassword);
    } catch (error) {
      console.error('パスワードリセットエラー:', error);
      throw error;
    }
  };

  const handleUpdateProfile = async (profileData) => {
    try {
      const updatedUser = await api.updateProfile(profileData);
      setCurrentUser(updatedUser);
      setView('home');
    } catch (error) {
      console.error('プロフィール更新エラー:', error);
      throw error;
    }
  };

  const loadData = async () => {
    try {
      const loadedEvents = await api.getEvents();
      setEvents(loadedEvents);
    } catch (error) {
      console.error('イベント読み込みエラー:', error);
      setEvents([]);
    }
  };

  const createEvent = async (eventData) => {
    try {
      const newEvent = await api.createEvent(eventData);
      setEvents([...events, newEvent]);
      setCurrentEvent(newEvent);
      setView('event-detail');
    } catch (error) {
      console.error('イベント作成エラー:', error);
      alert('イベントの作成に失敗しました');
    }
  };

  const updateEventInfo = async (eventId, eventData) => {
    try {
      const updatedEvent = await api.updateEventInfo(eventId, eventData);
      setEvents(events.map(e => e.id === eventId ? updatedEvent : e));
      setCurrentEvent(updatedEvent);
      loadEventApplications(eventId);
      setView('event-detail');
      alert('イベントを更新しました');
    } catch (error) {
      console.error('イベント更新エラー:', error);
      alert('イベントの更新に失敗しました');
    }
  };

  const submitApplication = async (eventId, applicationData) => {
    try {
      const newApplication = await api.createApplication({
        eventId,
        ...applicationData
      });
      setApplications([...applications, newApplication]);
      setView('application-success');
    } catch (error) {
      console.error('応募送信エラー:', error);
      alert('応募の送信に失敗しました');
    }
  };

  const selectApplicant = async (eventId, applicationId) => {
    try {
      // イベントと応募データを取得
      const event = await api.getEvent(eventId);
      const application = await api.getApplication(applicationId);

      if (!event || !application) {
        alert('データの取得に失敗しました');
        return;
      }

      if (!event.selectedApplicants) {
        event.selectedApplicants = [];
      }

      if (event.selectedApplicants.length >= event.maxParticipants) {
        alert('定員に達しています');
        return;
      }

      // イベントと応募を更新
      event.selectedApplicants.push(applicationId);
      const updatedEvent = await api.updateEvent(eventId, { selectedApplicants: event.selectedApplicants });
      const updatedApplication = await api.updateApplication(applicationId, { status: 'selected' });

      setEvents(events.map(e => e.id === eventId ? updatedEvent : e));
      setApplications(applications.map(a => a.id === applicationId ? updatedApplication : a));
      setCurrentEvent(updatedEvent);

      alert(`${application.name}さんを選択しました！🎉`);
    } catch (error) {
      console.error('選択エラー:', error);
      alert('選択に失敗しました');
    }
  };

  const loadEventApplications = async (eventId) => {
    try {
      const loadedApps = await api.getApplications(eventId);
      setApplications(loadedApps);
    } catch (error) {
      console.error('応募データ読み込みエラー:', error);
      setApplications([]);
    }
  };

  const viewEventDetail = (event) => {
    setCurrentEvent(event);

    // 自分が作成したイベントの場合は詳細画面、他人のイベントの場合は応募画面
    if (currentUser && event.creatorId === currentUser.id) {
      loadEventApplications(event.id);
      setView('event-detail');
    } else {
      setView('apply');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    const confirmed = window.confirm('本当に削除していいですか？\n\nこの操作は取り消せません。');

    if (!confirmed) {
      return;
    }

    try {
      await api.deleteEvent(eventId);

      // イベントリストから削除
      setEvents(events.filter(e => e.id !== eventId));

      alert('イベントを削除しました');
      setView('home');
    } catch (error) {
      console.error('イベント削除エラー:', error);
      alert('イベントの削除に失敗しました');
    }
  };

  const handleEditEvent = (event) => {
    setCurrentEvent(event);
    setView('edit-event');
  };

  const shareEvent = (event) => {
    const url = `${window.location.origin}?event=${event.id}`;

    // URLをクリップボードにコピー
    navigator.clipboard.writeText(url).then(() => {
      // Web Share APIが使える場合は選択肢を提供
      if (navigator.share) {
        const shouldUseWebShare = window.confirm('URLをコピーしました！\n\nOKを押すと共有メニューが開きます。\nキャンセルを押すとそのままクリップボードにコピーされた状態になります。');
        if (shouldUseWebShare) {
          navigator.share({
            title: event.title,
            text: `${event.title} - 参加者募集中！`,
            url: url
          }).catch(() => {
            // ユーザーがキャンセルした場合は何もしない
          });
        }
      } else {
        alert('URLをコピーしました！\n\n' + url + '\n\nSNSでシェアしてください 📋');
      }
    }).catch(() => {
      // クリップボードへのコピーが失敗した場合
      alert('URLを表示します：\n\n' + url);
    });
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day}(${weekday}) ${hours}:${minutes}`;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('event');
    if (eventId) {
      api.getEvent(eventId)
        .then(event => {
          setCurrentEvent(event);
          setView('apply');
        })
        .catch(error => {
          console.error('イベント読み込みエラー:', error);
        });
    }
  }, []);

  const MarbleBackground = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -2,
      background: `
        radial-gradient(circle at 20% 50%, #D9CFC1 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, #B67352 0%, transparent 50%),
        radial-gradient(circle at 40% 20%, #EBE5D9 0%, transparent 50%),
        radial-gradient(circle at 90% 30%, #A0522D 0%, transparent 50%),
        radial-gradient(circle at 10% 80%, #F5F1E8 0%, transparent 50%),
        radial-gradient(circle at 60% 60%, #8B6F47 0%, transparent 50%),
        linear-gradient(135deg, #F5F1E8 0%, #D9CFC1 50%, #B67352 100%)
      `
    }} />
  );

  const GlassOverlay = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      backgroundColor: 'rgba(255, 250, 245, 0.2)',
      backdropFilter: 'blur(80px)',
      WebkitBackdropFilter: 'blur(80px)'
    }} />
  );

  if (view === 'profile') {
    return (
      <>
        <MarbleBackground />
        <GlassOverlay />
        <ProfileView
          user={currentUser}
          onUpdate={handleUpdateProfile}
          onLogout={handleLogout}
          onBack={() => setView('home')}
        />
      </>
    );
  }

  if (view === 'register') {
    return (
      <>
        <MarbleBackground />
        <GlassOverlay />
        <RegisterView
          onRegister={handleRegister}
          onBack={() => setView('home')}
          onSwitchToLogin={() => setView('login')}
        />
      </>
    );
  }

  if (view === 'login') {
    return (
      <>
        <MarbleBackground />
        <GlassOverlay />
        <LoginView
          onLogin={handleLogin}
          onBack={() => setView('home')}
          onSwitchToRegister={() => setView('register')}
          onSwitchToReset={() => setView('reset-password')}
        />
      </>
    );
  }

  if (view === 'reset-password') {
    return (
      <>
        <MarbleBackground />
        <GlassOverlay />
        <ResetPasswordView
          onResetPassword={handleResetPassword}
          onBack={() => setView('home')}
          onSwitchToLogin={() => setView('login')}
        />
      </>
    );
  }

  if (view === 'home') {
    return (
      <>
        <MarbleBackground />
        <GlassOverlay />
        <HomeView
          events={events}
          currentUser={currentUser}
          onCreateNew={() => setView('create')}
          onViewEvent={viewEventDetail}
          onLogin={() => setView('login')}
          onRegister={() => setView('register')}
          onProfile={() => setView('profile')}
          formatDateTime={formatDateTime}
          getEventStatus={getEventStatus}
        />
      </>
    );
  }

  if (view === 'create') {
    return (
      <>
        <MarbleBackground />
        <GlassOverlay />
        <CreateEventView
          onCreate={createEvent}
          onBack={() => setView('home')}
        />
      </>
    );
  }

  if (view === 'edit-event') {
    return (
      <>
        <MarbleBackground />
        <GlassOverlay />
        <CreateEventView
          editingEvent={currentEvent}
          onUpdate={updateEventInfo}
          onBack={() => {
            loadEventApplications(currentEvent.id);
            setView('event-detail');
          }}
        />
      </>
    );
  }

  if (view === 'apply') {
    return (
      <>
        <MarbleBackground />
        <GlassOverlay />
        <ApplicationView
          event={currentEvent}
          onSubmit={submitApplication}
          onBack={() => setView('home')}
          formatDateTime={formatDateTime}
          getEventStatus={getEventStatus}
        />
      </>
    );
  }

  if (view === 'event-detail') {
    return (
      <>
        <MarbleBackground />
        <GlassOverlay />
        <EventDetailView
          event={currentEvent}
          applications={applications}
          currentUser={currentUser}
          onSelectApplicant={selectApplicant}
          onShare={shareEvent}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
          onBack={() => setView('home')}
          formatDateTime={formatDateTime}
          getEventStatus={getEventStatus}
        />
      </>
    );
  }

  if (view === 'application-success') {
    return (
      <>
        <MarbleBackground />
        <GlassOverlay />
        <ApplicationSuccessView onBackToHome={() => setView('home')} />
      </>
    );
  }
}

function HomeView({ events, currentUser, onCreateNew, onViewEvent, onLogin, onRegister, onProfile, formatDateTime, getEventStatus }) {
  const [displayCount, setDisplayCount] = useState(10);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // タブに応じてイベントをフィルタリング
  const filteredEvents = activeTab === 'my' && currentUser
    ? events.filter(event => event.creatorId === currentUser.id)
    : events;

  // 終了後2日以上経過したイベントを除外
  const activeEvents = filteredEvents.filter(event => {
    const status = getEventStatus(event);
    if (status !== 'closed') return true;

    // 締切による終了の場合、締切から2日以内なら表示
    if (event.deadline) {
      const deadlineDate = new Date(event.deadline);
      const twoDaysAfterDeadline = new Date(deadlineDate.getTime() + 2 * 24 * 60 * 60 * 1000);
      return new Date() <= twoDaysAfterDeadline;
    }

    // 定員による終了の場合は、終了後も表示し続ける
    // （終了時刻が記録されていないため）
    return true;
  });

  // 新着順（createdAtで降順）にソート
  const sortedEvents = [...activeEvents].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // 表示するイベントを制限
  const displayedEvents = sortedEvents.slice(0, displayCount);
  const hasMore = sortedEvents.length > displayCount;

  const loadMore = () => {
    setDisplayCount(prev => prev + 10);
  };

  return (
    <div className="min-h-screen p-4" style={{fontFamily: "'Noto Sans JP', sans-serif"}}>
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6 pt-4">
          {/* 左側の空白 */}
          <div className="flex-1"></div>

          {/* ロゴ */}
          <div className="flex-1 text-center">
            <h1 className="text-5xl" style={{
              fontFamily: "'Elns Sans', sans-serif",
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '1px',
              textShadow: '0 2px 20px rgba(0,0,0,0.1)'
            }}>
              Between
            </h1>
          </div>

          {/* PC版: ログイン/登録/プロフィール、SP版: ハンバーガーメニュー */}
          <div className="flex-1 flex justify-end gap-3">
            {/* SP版: ハンバーガーメニュー */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl hover:opacity-90 transition-all"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
              aria-label="メニュー"
            >
              {isMobileMenuOpen ? (
                <X size={24} color="#FFFFFF" />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="4" y1="8" x2="20" y2="8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="4" y1="16" x2="20" y2="16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </button>

            {/* PC版: ログイン/登録/プロフィール */}
            {currentUser ? (
              <button
                onClick={onProfile}
                className="hidden md:flex rounded-full hover:opacity-90 transition-all cursor-pointer"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '2px'
                }}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{
                  backgroundColor: '#9CA3AF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {currentUser.profileImage ? (
                    <img src={currentUser.profileImage} alt="プロフィール" className="w-full h-full object-cover" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#666666"/>
                    </svg>
                  )}
                </div>
              </button>
            ) : (
              <>
                <button
                  onClick={onLogin}
                  className="hidden md:block px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-all"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                >
                  ログイン
                </button>
                <button
                  onClick={onRegister}
                  className="hidden md:block px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-all"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                >
                  新規登録
                </button>
              </>
            )}
          </div>
        </div>

        {/* SP版: モバイルメニュー */}
        {isMobileMenuOpen && (
          <div className="md:hidden mb-6 rounded-2xl overflow-hidden shadow-lg" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            {currentUser ? (
              <div className="flex flex-col">
                <button
                  onClick={() => {
                    onProfile();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-4 hover:bg-white/10 transition-all"
                  style={{ color: '#FFFFFF' }}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{
                    backgroundColor: '#9CA3AF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {currentUser.profileImage ? (
                      <img src={currentUser.profileImage} alt="プロフィール" className="w-full h-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#666666"/>
                      </svg>
                    )}
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium">{currentUser.name}</div>
                    <div className="text-sm opacity-80">プロフィールを見る</div>
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                <button
                  onClick={() => {
                    onLogin();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-4 hover:bg-white/10 transition-all border-b border-white/20"
                  style={{ color: '#FFFFFF' }}
                >
                  <User size={20} />
                  <span className="font-medium">ログイン</span>
                </button>
                <button
                  onClick={() => {
                    onRegister();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-4 hover:bg-white/10 transition-all"
                  style={{ color: '#FFFFFF' }}
                >
                  <User size={20} />
                  <span className="font-medium">新規登録</span>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="text-center mb-8">
          <p className="text-lg" style={{color: '#FFFFFF'}}>やりたいことを投稿して、仲間を見つけよう</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:justify-center">
          {/* メインコンテンツエリア */}
          <div className="flex-1 max-w-2xl mx-auto w-full">
            <button
              onClick={onCreateNew}
              className="w-full py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all mb-6"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              ＋ 新しいイベントを作る
            </button>

            {/* タブ切り替え */}
            {currentUser && (
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setActiveTab('all')}
                  className="flex-1 py-3 rounded-xl font-medium transition-all"
                  style={{
                    backgroundColor: activeTab === 'all' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                >
                  すべてのイベント
                </button>
                <button
                  onClick={() => setActiveTab('my')}
                  className="flex-1 py-3 rounded-xl font-medium transition-all"
                  style={{
                    backgroundColor: activeTab === 'my' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                >
                  マイイベント
                </button>
              </div>
            )}

            <div className="space-y-4">
              {displayedEvents.length === 0 ? (
                <div className="rounded-2xl p-8 text-center shadow-md" style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}>
                  まだイベントがありません
                </div>
              ) : (
                <>
                  {displayedEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={() => onViewEvent(event)}
                      className="rounded-2xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)'
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-bold" style={{color: '#FFFFFF'}}>{event.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium`} style={{
                          backgroundColor: getEventStatus(event) === 'open' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                          color: '#FFFFFF'
                        }}>
                          {getEventStatus(event) === 'open' ? '募集中' : '終了'}
                        </span>
                      </div>
                      
                      <p className="mb-4" style={{color: '#FFFFFF', opacity: 0.9}}>{event.description}</p>
                      
                      <div className="space-y-2 text-sm" style={{color: '#FFFFFF', opacity: 0.85}}>
                        {event.date && (
                          <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            <span>{formatDateTime(event.date)}</span>
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin size={16} />
                            <span>{event.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users size={16} />
                          <span>募集人数: {event.maxParticipants === 21 ? '21人〜' : `${event.maxParticipants}人`}</span>
                        </div>
                        {event.deadline && (
                          <div className="flex items-center gap-2">
                            <Clock size={16} />
                            <span>締切: {formatDateTime(event.deadline)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {hasMore && (
                    <button
                      onClick={loadMore}
                      className="w-full py-3 rounded-xl font-medium text-base shadow-md hover:shadow-lg transition-all"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255, 255, 255, 0.3)'
                      }}
                    >
                      もっと見る
                    </button>
                  )}
                </>
              )}
            </div>

            {/* SP: イベント情報カード - イベントリストの最下層 */}
            <div className="block lg:hidden mt-6">
              <EventInfoCard />
            </div>
          </div>

          {/* PC: 右サイドバー - イベント情報カード */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-4">
              <EventInfoCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventInfoCard() {
  return (
    <div className="rounded-2xl p-6 shadow-lg" style={{
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.3)'
    }}>
      <h3 className="text-lg font-bold mb-4" style={{color: '#FFFFFF'}}>📢 イベント情報</h3>
      
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📅</div>
        <p className="text-base font-medium" style={{color: '#FFFFFF', opacity: 0.9}}>
          掲載イベント募集中
        </p>
        <p className="text-sm mt-2" style={{color: '#FFFFFF', opacity: 0.7}}>
          あなたのイベントを<br />こちらに掲載しませんか？
        </p>
        <p className="text-sm mt-4" style={{color: '#FFFFFF', opacity: 0.8}}>
          <a
            href="https://www.threads.net/@limi_designlife"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
            style={{color: '#FFFFFF', textDecoration: 'underline'}}
            onMouseEnter={(e) => e.currentTarget.style.color = '#A0522D'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#FFFFFF'}
          >
            @limi_designlife
          </a>
          のThreadsか<br />InstagramのDMまでご連絡ください
        </p>
      </div>
    </div>
  );
}

function CreateEventView({ onCreate, onUpdate, editingEvent, onBack }) {
  const [formData, setFormData] = useState(editingEvent ? {
    title: editingEvent.title || '',
    description: editingEvent.description || '',
    date: editingEvent.date || '',
    location: editingEvent.location || '',
    maxParticipants: editingEvent.maxParticipants || 1,
    deadline: editingEvent.deadline || ''
  } : {
    title: '',
    description: '',
    date: '',
    location: '',
    maxParticipants: 1,
    deadline: ''
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.description) {
      alert('タイトルと説明は必須です');
      return;
    }

    if (editingEvent) {
      onUpdate(editingEvent.id, formData);
    } else {
      onCreate(formData);
    }
  };

  return (
    <div className="min-h-screen p-4" style={{fontFamily: "'Noto Sans JP', sans-serif"}}>
      <div className="max-w-2xl mx-auto pt-8">
        <button onClick={onBack} className="mb-6 font-medium" style={{color: '#FFFFFF'}}>← 戻る</button>
        
        <div className="rounded-2xl p-6 shadow-lg" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <h2 className="text-2xl font-bold mb-6" style={{color: '#FFFFFF'}}>
            {editingEvent ? 'イベントを編集' : 'イベントを作成'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                タイトル *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="例：誰かと夜カフェしたい☕️"
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                説明 *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="どんなことをしたいか、どんな人と会いたいかを書いてください"
                rows={4}
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                希望日時（任意）
              </label>
              <input
                type="datetime-local"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF',
                  colorScheme: 'dark'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                場所（任意）
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="例：渋谷周辺"
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                募集人数
              </label>
              <select
                value={formData.maxParticipants}
                onChange={(e) => setFormData({...formData, maxParticipants: parseInt(e.target.value)})}
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}
              >
                {Array.from({length: 20}, (_, i) => i + 1).map(n => (
                  <option key={n} value={n} style={{backgroundColor: '#4C80B0'}}>{n}人</option>
                ))}
                <option value={21} style={{backgroundColor: '#4C80B0'}}>21人〜</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                締切（任意）
              </label>
              <input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF',
                  colorScheme: 'dark'
                }}
              />
            </div>

            <button
              onClick={handleSubmit}
              className="w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              {editingEvent ? 'イベントを更新' : 'イベントを作成'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApplicationView({ event, onSubmit, onBack, formatDateTime, getEventStatus }) {
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    contact: ''
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.contact) {
      alert('お名前と連絡先は必須です');
      return;
    }

    // 締切チェック
    if (getEventStatus(event) === 'closed') {
      alert('このイベントは募集を終了しています');
      return;
    }

    onSubmit(event.id, formData);
  };

  if (!event) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center" style={{fontFamily: "'Noto Sans JP', sans-serif"}}>
        <div className="text-center">
          <p style={{color: '#FFFFFF'}}>イベントが見つかりません</p>
          <button onClick={onBack} className="mt-4 font-medium" style={{color: '#FFFFFF'}}>ホームに戻る</button>
        </div>
      </div>
    );
  }

  const eventStatus = getEventStatus(event);
  const isClosed = eventStatus === 'closed';

  return (
    <div className="min-h-screen p-4" style={{fontFamily: "'Noto Sans JP', sans-serif"}}>
      <div className="max-w-2xl mx-auto pt-8">
        <button onClick={onBack} className="mb-6 font-medium" style={{color: '#FFFFFF'}}>← 戻る</button>
        
        <div className="rounded-2xl p-6 shadow-lg mb-6" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <h2 className="text-2xl font-bold mb-3" style={{color: '#FFFFFF'}}>{event.title}</h2>
          <p className="mb-4" style={{color: '#FFFFFF', opacity: 0.9}}>{event.description}</p>
          
          <div className="space-y-2 text-sm" style={{color: '#FFFFFF', opacity: 0.85}}>
            {event.date && (
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{formatDateTime(event.date)}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>{event.location}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl p-6 shadow-lg" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <h3 className="text-xl font-bold mb-6" style={{color: '#FFFFFF'}}>参加を希望する</h3>

          {isClosed && (
            <div className="mb-6 rounded-xl p-4" style={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <p className="text-center font-medium" style={{color: '#FFFFFF'}}>
                ⚠️ このイベントは募集を終了しています
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                お名前 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="例：田中太郎"
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                メッセージ・自己紹介
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="例：最近夜カフェハマってて気になりました☕️"
                rows={4}
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                連絡先（LINE / Instagram / X / メール等）*
              </label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({...formData, contact: e.target.value})}
                placeholder="例：@your_instagram または LINE ID: abc123"
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}
              />
              <p className="text-xs mt-1" style={{color: '#FFFFFF', opacity: 0.7}}>
                ※ 主催者が選んだ場合のみ連絡が届きます
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isClosed}
              className="w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: isClosed ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                opacity: isClosed ? 0.5 : 1,
                cursor: isClosed ? 'not-allowed' : 'pointer'
              }}
            >
              <Send size={20} />
              {isClosed ? '募集終了' : '応募する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventDetailView({ event, applications, currentUser, onSelectApplicant, onShare, onEdit, onDelete, onBack, formatDateTime, getEventStatus }) {
  if (!event) return null;

  const isEventOwner = currentUser && event.creatorId === currentUser.id;
  const selectedCount = event.selectedApplicants?.length || 0;
  const canSelectMore = selectedCount < event.maxParticipants;
  const eventStatus = getEventStatus(event);
  const isClosed = eventStatus === 'closed';

  return (
    <div className="min-h-screen p-4" style={{fontFamily: "'Noto Sans JP', sans-serif"}}>
      <div className="max-w-2xl mx-auto pt-8">
        <button onClick={onBack} className="mb-6 font-medium" style={{color: '#FFFFFF'}}>← 戻る</button>
        
        <div className="rounded-2xl p-6 shadow-lg mb-6" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold" style={{color: '#FFFFFF'}}>{event.title}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium`} style={{
                  backgroundColor: isClosed ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}>
                  {isClosed ? '終了' : '募集中'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEventOwner && (
                <>
                  <button
                    onClick={() => onEdit(event)}
                    className="px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    編集
                  </button>
                  <button
                    onClick={() => onDelete(event.id)}
                    className="px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
                    style={{
                      backgroundColor: 'rgba(255, 100, 100, 0.25)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255, 100, 100, 0.3)'
                    }}
                  >
                    削除
                  </button>
                </>
              )}
              <button
                onClick={() => onShare(event)}
                className="px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
              >
                <Share2 size={16} />
                シェア
              </button>
            </div>
          </div>
          
          <p className="mb-4" style={{color: '#FFFFFF', opacity: 0.9}}>{event.description}</p>
          
          <div className="space-y-2 text-sm mb-4" style={{color: '#FFFFFF', opacity: 0.85}}>
            {event.date && (
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{formatDateTime(event.date)}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>{event.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>募集: {selectedCount} / {event.maxParticipants === 21 ? '21人〜' : `${event.maxParticipants}人`}</span>
            </div>
          </div>

          {!isClosed && (
            <div className="rounded-xl p-4" style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <p className="text-sm font-medium" style={{color: '#FFFFFF'}}>
                💡 このリンクをSNSでシェアして参加者を募集しましょう！
              </p>
            </div>
          )}

          {isClosed && (
            <div className="rounded-xl p-4" style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <p className="text-sm font-medium text-center" style={{color: '#FFFFFF'}}>
                ⚠️ このイベントは募集を終了しています
              </p>
            </div>
          )}
        </div>

        {isEventOwner && (
          <div className="rounded-2xl p-6 shadow-lg" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <h3 className="text-xl font-bold mb-4" style={{color: '#FFFFFF'}}>
              応募者一覧 ({applications.length}件)
            </h3>

            {applications.length === 0 ? (
              <div className="text-center py-8" style={{color: '#FFFFFF', opacity: 0.8}}>
                まだ応募がありません
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map(app => {
                  const isSelected = event.selectedApplicants?.includes(app.id);

                  return (
                    <div
                      key={app.id}
                      className="rounded-xl p-4"
                      style={{
                        backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.3)'
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold" style={{color: '#FFFFFF'}}>{app.name}</h4>
                        {isSelected ? (
                          <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1" style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            color: '#FFFFFF'
                          }}>
                            <Check size={14} />
                            選択済み
                          </span>
                        ) : canSelectMore ? (
                          <button
                            onClick={() => onSelectApplicant(event.id, app.id)}
                            className="px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-all"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.25)',
                              backdropFilter: 'blur(10px)',
                              WebkitBackdropFilter: 'blur(10px)',
                              color: '#FFFFFF',
                              border: '1px solid rgba(255, 255, 255, 0.3)'
                            }}
                          >
                            この人を選ぶ
                          </button>
                        ) : null}
                      </div>

                      {app.message && (
                        <p className="text-sm mb-3" style={{color: '#FFFFFF', opacity: 0.9}}>{app.message}</p>
                      )}

                      {isSelected && (
                        <div className="rounded-lg p-3" style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          border: '1px solid rgba(255, 255, 255, 0.25)'
                        }}>
                          <p className="text-sm" style={{color: '#FFFFFF'}}>
                            <span className="font-medium">連絡先:</span> {app.contact}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicationSuccessView({ onBackToHome }) {
  return (
    <div className="min-h-screen p-4 flex items-center justify-center" style={{fontFamily: "'Noto Sans JP', sans-serif"}}>
      <div className="max-w-md mx-auto text-center">
        <div className="rounded-2xl p-8 shadow-lg" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold mb-4" style={{color: '#FFFFFF'}}>応募完了！</h2>
          <p className="text-lg mb-6" style={{color: '#FFFFFF', opacity: 0.9}}>
            応募が完了しました。<br />
            主催者が選択した場合、登録した連絡先に通知が届きます。
          </p>
          <button
            onClick={onBackToHome}
            className="w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  );
}

function RegisterView({ onRegister, onBack, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    profileImage: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await resizeAndConvertToBase64(file);
      setFormData({...formData, profileImage: base64});
      setImagePreview(base64);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!formData.email || !formData.password || !formData.name || !formData.age) {
      setError('すべての項目を入力してください');
      return;
    }

    if (formData.password.length < 6) {
      setError('パスワードは6文字以上にしてください');
      return;
    }

    setIsLoading(true);
    try {
      await onRegister(formData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4" style={{fontFamily: "'Noto Sans JP', sans-serif"}}>
      <div className="max-w-md mx-auto pt-8">
        <button onClick={onBack} className="mb-6 font-medium" style={{color: '#FFFFFF'}}>← 戻る</button>

        <div className="rounded-2xl p-6 shadow-lg" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <h2 className="text-2xl font-bold mb-6 text-center" style={{color: '#FFFFFF'}}>新規登録</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl" style={{
              backgroundColor: 'rgba(255, 100, 100, 0.3)',
              border: '1px solid rgba(255, 100, 100, 0.5)',
              color: '#FFFFFF'
            }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-center" style={{color: '#FFFFFF'}}>
                プロフィール画像
              </label>
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full overflow-hidden" style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="プロフィール" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} style={{color: 'rgba(255, 255, 255, 0.5)'}} />
                  )}
                </div>
                <label className="px-4 py-2 rounded-xl font-medium cursor-pointer hover:opacity-90 transition-all" style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}>
                  画像を選択
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-center" style={{color: '#FFFFFF', opacity: 0.7}}>
                  JPG, PNG（5MB以下）
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                お名前 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="例：田中太郎"
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                メールアドレス *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="例：tanaka@example.com"
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                パスワード *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="6文字以上"
                  className="w-full px-4 py-3 rounded-xl pr-12"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#FFFFFF'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  style={{color: '#FFFFFF', opacity: 0.7}}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                年齢 *
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: e.target.value})}
                placeholder="例：25"
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              style={{
                backgroundColor: isLoading ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? '登録中...' : '登録する'}
            </button>

            <div className="text-center pt-4">
              <button
                onClick={onSwitchToLogin}
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{color: '#FFFFFF'}}
              >
                既にアカウントをお持ちの方はこちら
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginView({ onLogin, onBack, onSwitchToRegister, onSwitchToReset }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!formData.email || !formData.password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    setIsLoading(true);
    try {
      await onLogin(formData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4" style={{fontFamily: "'Noto Sans JP', sans-serif"}}>
      <div className="max-w-md mx-auto pt-8">
        <button onClick={onBack} className="mb-6 font-medium" style={{color: '#FFFFFF'}}>← 戻る</button>

        <div className="rounded-2xl p-6 shadow-lg" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <h2 className="text-2xl font-bold mb-6 text-center" style={{color: '#FFFFFF'}}>ログイン</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl" style={{
              backgroundColor: 'rgba(255, 100, 100, 0.3)',
              border: '1px solid rgba(255, 100, 100, 0.5)',
              color: '#FFFFFF'
            }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                メールアドレス *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="例：tanaka@example.com"
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                パスワード *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="パスワードを入力"
                  className="w-full px-4 py-3 rounded-xl pr-12"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#FFFFFF'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  style={{color: '#FFFFFF', opacity: 0.7}}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              style={{
                backgroundColor: isLoading ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </button>

            <div className="text-center pt-4 space-y-2">
              <button
                onClick={onSwitchToReset}
                className="text-sm font-medium hover:opacity-80 transition-opacity block w-full"
                style={{color: '#FFFFFF'}}
              >
                パスワードを忘れた人はこちら
              </button>
              <button
                onClick={onSwitchToRegister}
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{color: '#FFFFFF'}}
              >
                アカウントをお持ちでない方はこちら
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordView({ onResetPassword, onBack, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!formData.email || !formData.newPassword || !formData.confirmPassword) {
      setError('すべての項目を入力してください');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('パスワードは6文字以上にしてください');
      return;
    }

    setIsLoading(true);
    try {
      await onResetPassword(formData.email, formData.newPassword);
      setSuccess('パスワードをリセットしました！新しいパスワードでログインしてください。');
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4" style={{fontFamily: "'Noto Sans JP', sans-serif"}}>
      <div className="max-w-md mx-auto pt-8">
        <button onClick={onBack} className="mb-6 font-medium" style={{color: '#FFFFFF'}}>← 戻る</button>

        <div className="rounded-2xl p-6 shadow-lg" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <h2 className="text-2xl font-bold mb-6 text-center" style={{color: '#FFFFFF'}}>パスワードリセット</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl" style={{
              backgroundColor: 'rgba(255, 100, 100, 0.3)',
              border: '1px solid rgba(255, 100, 100, 0.5)',
              color: '#FFFFFF'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl" style={{
              backgroundColor: 'rgba(100, 255, 100, 0.3)',
              border: '1px solid rgba(100, 255, 100, 0.5)',
              color: '#FFFFFF'
            }}>
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                メールアドレス *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="登録済みのメールアドレス"
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                新しいパスワード *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                  placeholder="6文字以上"
                  className="w-full px-4 py-3 rounded-xl pr-12"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#FFFFFF'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  style={{color: '#FFFFFF', opacity: 0.7}}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                新しいパスワード（確認）*
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                placeholder="もう一度入力"
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              style={{
                backgroundColor: isLoading ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'リセット中...' : 'パスワードをリセット'}
            </button>

            <div className="text-center pt-4">
              <button
                onClick={onSwitchToLogin}
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{color: '#FFFFFF'}}
              >
                ログイン画面に戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileView({ user, onUpdate, onLogout, onBack }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    age: user?.age || '',
    profileImage: user?.profileImage || ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(user?.profileImage || '');

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await resizeAndConvertToBase64(file);
      setFormData({...formData, profileImage: base64});
      setImagePreview(base64);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!formData.name || !formData.age) {
      setError('名前と年齢は必須です');
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(formData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4" style={{fontFamily: "'Noto Sans JP', sans-serif"}}>
      <div className="max-w-md mx-auto pt-8">
        <button onClick={onBack} className="mb-6 font-medium" style={{color: '#FFFFFF'}}>← 戻る</button>

        <div className="rounded-2xl p-6 shadow-lg" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <h2 className="text-2xl font-bold mb-6 text-center" style={{color: '#FFFFFF'}}>プロフィール編集</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl" style={{
              backgroundColor: 'rgba(255, 100, 100, 0.3)',
              border: '1px solid rgba(255, 100, 100, 0.5)',
              color: '#FFFFFF'
            }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-center" style={{color: '#FFFFFF'}}>
                プロフィール画像
              </label>
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full overflow-hidden" style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="プロフィール" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} style={{color: 'rgba(255, 255, 255, 0.5)'}} />
                  )}
                </div>
                <div className="flex gap-2">
                  <label className="px-4 py-2 rounded-xl font-medium cursor-pointer hover:opacity-90 transition-all" style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    画像を変更
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {imagePreview && (
                    <button
                      onClick={() => {
                        setFormData({...formData, profileImage: ''});
                        setImagePreview('');
                      }}
                      className="px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-all"
                      style={{
                        backgroundColor: 'rgba(255, 100, 100, 0.25)',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255, 100, 100, 0.3)'
                      }}
                    >
                      画像を削除
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                お名前 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="例：田中太郎"
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                年齢 *
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: e.target.value})}
                placeholder="例：25"
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: '#FFFFFF'}}>
                メールアドレス
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  opacity: 0.7,
                  cursor: 'not-allowed'
                }}
              />
              <p className="text-xs mt-1" style={{color: '#FFFFFF', opacity: 0.7}}>
                ※ メールアドレスは変更できません
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              style={{
                backgroundColor: isLoading ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? '更新中...' : '更新する'}
            </button>

            <button
              onClick={onLogout}
              className="w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all mt-4"
              style={{
                backgroundColor: 'rgba(255, 100, 100, 0.25)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 100, 100, 0.3)'
              }}
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}