var SeedData = (function () {
  var professors = [
    {
      id: 'prof1',
      name: '김지능',
      field: '머신러닝 / 딥러닝',
      description: 'MIT 박사, 자연어처리 및 강화학습 연구',
      avatar: '',
      email: 'jinung.kim@university.ac.kr',
      order: 1
    },
    {
      id: 'prof2',
      name: '이데이터',
      field: '데이터사이언스',
      description: 'Stanford 박사, 빅데이터 분석 및 시각화 전문',
      avatar: '',
      email: 'data.lee@university.ac.kr',
      order: 2
    },
    {
      id: 'prof3',
      name: '박비전',
      field: '컴퓨터비전',
      description: 'KAIST 박사, 영상인식 및 자율주행 연구',
      avatar: '',
      email: 'vision.park@university.ac.kr',
      order: 3
    },
    {
      id: 'prof4',
      name: '최융합',
      field: 'AI 융합 응용',
      description: '서울대 박사, AI 헬스케어 및 스마트팩토리 연구',
      avatar: '',
      email: 'convergence.choi@university.ac.kr',
      order: 4
    }
  ];

  var curriculum = [
    { id: 'cur1', year: 1, category: '전공기초', name: '프로그래밍 기초 (Python)', credits: 3, order: 1 },
    { id: 'cur2', year: 1, category: '전공기초', name: '인공지능 개론', credits: 3, order: 2 },
    { id: 'cur3', year: 1, category: '전공기초', name: '선형대수학', credits: 3, order: 3 },
    { id: 'cur4', year: 1, category: '전공기초', name: '확률과 통계', credits: 3, order: 4 },
    { id: 'cur5', year: 1, category: '교양', name: '컴퓨팅 사고', credits: 2, order: 5 },
    { id: 'cur6', year: 2, category: '전공필수', name: '자료구조와 알고리즘', credits: 3, order: 1 },
    { id: 'cur7', year: 2, category: '전공필수', name: '머신러닝', credits: 3, order: 2 },
    { id: 'cur8', year: 2, category: '전공선택', name: '데이터베이스', credits: 3, order: 3 },
    { id: 'cur9', year: 2, category: '전공선택', name: '웹 프로그래밍', credits: 3, order: 4 },
    { id: 'cur10', year: 2, category: '전공선택', name: '수치해석', credits: 3, order: 5 },
    { id: 'cur11', year: 3, category: '전공필수', name: '딥러닝', credits: 3, order: 1 },
    { id: 'cur12', year: 3, category: '전공필수', name: '컴퓨터비전', credits: 3, order: 2 },
    { id: 'cur13', year: 3, category: '전공선택', name: '자연어처리', credits: 3, order: 3 },
    { id: 'cur14', year: 3, category: '전공선택', name: '강화학습', credits: 3, order: 4 },
    { id: 'cur15', year: 3, category: '전공선택', name: '클라우드 컴퓨팅', credits: 3, order: 5 },
    { id: 'cur16', year: 4, category: '전공필수', name: '캡스톤 디자인', credits: 3, order: 1 },
    { id: 'cur17', year: 4, category: '전공필수', name: 'AI 프로젝트 실습', credits: 3, order: 2 },
    { id: 'cur18', year: 4, category: '전공선택', name: '생성형 AI', credits: 3, order: 3 },
    { id: 'cur19', year: 4, category: '전공선택', name: 'AI 윤리와 법', credits: 3, order: 4 },
    { id: 'cur20', year: 4, category: '전공선택', name: '산학협력 인턴십', credits: 6, order: 5 }
  ];

  var stats = [
    { id: 'stat1', label: '전임교수', value: 15, suffix: '' },
    { id: 'stat2', label: '재학생', value: 200, suffix: '' },
    { id: 'stat3', label: '취업률', value: 95, suffix: '%' },
    { id: 'stat4', label: '산학협력 기업', value: 50, suffix: '' }
  ];

  var notices = [
    {
      id: 'notice1',
      title: '2026학년도 1학기 수강신청 안내',
      content: '2026학년도 1학기 수강신청이 아래와 같이 진행됩니다.\n\n■ 수강신청 기간: 2026.02.23(월) ~ 02.27(금)\n■ 수강정정 기간: 2026.03.02(월) ~ 03.06(금)\n■ 수강신청 방법: 학사포털 → 수강신청 메뉴\n\n자세한 사항은 학과 사무실로 문의하시기 바랍니다.',
      category: '학사',
      pinned: true,
      createdAt: '2026-02-15'
    },
    {
      id: 'notice2',
      title: 'AI 특강: 생성형 AI의 현재와 미래',
      content: '인공지능융합학과에서 아래와 같이 특강을 개최합니다.\n\n■ 주제: 생성형 AI의 현재와 미래\n■ 강사: 김인공 박사 (구글 코리아)\n■ 일시: 2026.03.20(금) 14:00~16:00\n■ 장소: 공학관 301호\n\n많은 참여 부탁드립니다.',
      category: '행사',
      pinned: false,
      createdAt: '2026-03-10'
    },
    {
      id: 'notice3',
      title: '2026 캡스톤 디자인 팀 모집',
      content: '2026학년도 캡스톤 디자인 프로젝트 팀 모집 안내입니다.\n\n■ 모집 기간: 2026.03.01 ~ 03.15\n■ 팀 구성: 3~5명\n■ 지원 분야: AI 헬스케어, 스마트시티, 자율주행, 자연어처리\n■ 신청 방법: 학과 홈페이지에서 신청서 다운로드 후 이메일 제출\n\n적극적인 참여 바랍니다.',
      category: '학사',
      pinned: false,
      createdAt: '2026-02-28'
    },
    {
      id: 'notice4',
      title: '학과 사무실 이전 안내',
      content: '인공지능융합학과 사무실이 아래와 같이 이전됩니다.\n\n■ 이전일: 2026.04.01\n■ 새 위치: 공학관 5층 501호\n■ 전화번호: 변경 없음 (02-1234-5678)\n\n이전 기간 중 업무가 지연될 수 있으니 양해 부탁드립니다.',
      category: '일반',
      pinned: false,
      createdAt: '2026-03-15'
    },
    {
      id: 'notice5',
      title: '하계 인턴십 프로그램 모집',
      content: '2026년 하계 산학협력 인턴십 프로그램 참가자를 모집합니다.\n\n■ 모집 기간: 2026.04.01 ~ 04.30\n■ 인턴십 기간: 2026.07.01 ~ 08.31\n■ 참여 기업: 삼성전자, LG AI연구소, 네이버, 카카오 외 10개사\n■ 지원 자격: 3학년 이상, 학점 3.5 이상\n■ 지원 방법: 학과 사무실 방문 또는 이메일 접수\n\n우수 인턴에게는 정규직 전환 기회가 제공됩니다.',
      category: '취업',
      pinned: true,
      createdAt: '2026-03-12'
    }
  ];

  var gallery = [
    {
      id: 'gal1',
      title: 'AI 연구실 오픈랩',
      description: '2026년 봄학기 AI 연구실 오픈랩 행사',
      imageUrl: 'https://picsum.photos/seed/ailab1/600/400',
      category: '행사',
      createdAt: '2026-03-01'
    },
    {
      id: 'gal2',
      title: '캡스톤 발표회',
      description: '2025년 캡스톤 디자인 최종 발표회 현장',
      imageUrl: 'https://picsum.photos/seed/capstone1/600/400',
      category: '행사',
      createdAt: '2025-12-15'
    },
    {
      id: 'gal3',
      title: '딥러닝 실습실',
      description: 'GPU 서버가 갖추어진 딥러닝 전용 실습실',
      imageUrl: 'https://picsum.photos/seed/deeplab/600/400',
      category: '시설',
      createdAt: '2026-01-10'
    },
    {
      id: 'gal4',
      title: '산학협력 MOU 체결',
      description: '삼성전자와의 산학협력 MOU 체결식',
      imageUrl: 'https://picsum.photos/seed/mou1/600/400',
      category: '행사',
      createdAt: '2026-02-20'
    },
    {
      id: 'gal5',
      title: '학생 해커톤',
      description: '2026 교내 AI 해커톤 대회 현장',
      imageUrl: 'https://picsum.photos/seed/hackathon/600/400',
      category: '행사',
      createdAt: '2026-03-05'
    },
    {
      id: 'gal6',
      title: '컴퓨터비전 연구실',
      description: '자율주행 시뮬레이션 연구 환경',
      imageUrl: 'https://picsum.photos/seed/cvlab/600/400',
      category: '시설',
      createdAt: '2026-01-20'
    }
  ];

  var contact = {
    phone: '02-1234-5678',
    email: 'ai-dept@university.ac.kr',
    address: '서울특별시 OO구 OO로 123 공학관 5층',
    mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3162.5!2d126.978!3d37.566!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDMzJzU3LjYiTiAxMjbCsDU4JzQwLjgiRQ!5e0!3m2!1sko!2skr!4v1',
    officeHours: '평일 09:00 ~ 18:00 (점심시간 12:00 ~ 13:00)'
  };

  function initAll() {
    DataStore.seed('professors', professors);
    DataStore.seed('curriculum', curriculum);
    DataStore.seed('stats', stats);
    DataStore.seed('notices', notices);
    DataStore.seed('gallery', gallery);
    DataStore.seedObject('contact', contact);
    _initAdmin();
  }

  function _initAdmin() {
    var existing = DataStore.getObject('admin');
    if (!existing || !existing.passwordHash) {
      _hashPassword('admin1234').then(function (hash) {
        DataStore.setObject('admin', { passwordHash: hash });
      });
    }
  }

  function _hashPassword(password) {
    var encoder = new TextEncoder();
    var data = encoder.encode(password);
    return crypto.subtle.digest('SHA-256', data).then(function (buffer) {
      var hashArray = Array.from(new Uint8Array(buffer));
      return hashArray.map(function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  return {
    initAll: initAll
  };
})();
