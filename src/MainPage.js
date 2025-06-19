import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "./api/axios.js";
import "./styles/MainPage.css";
import "./styles/Sidebar.css";
import "./styles/NavigationBar.css";
import "./styles/MainContent.css";

//const formatDate = (dateString) => {
//if (!dateString) return "없음";
//const date = new Date(dateString);
//return isNaN(date) ? "없음" : date.toLocaleDateString("ko-KR");
//};

const calculateDDay = (endDate) => {
  if (!endDate) return "없음";
  const target = new Date(endDate);
  if (isNaN(target)) return "없음";
  const today = new Date();
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  return diff > 0 ? `D-${diff}` : diff === 0 ? "D-DAY" : `D+${Math.abs(diff)}`;
};

const ProjectModal = ({ isOpen, onClose, onSubmit }) => {
  const [projectName, setProjectName] = useState("");
  const [dDay, setDDay] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (projectName.trim()) {
      onSubmit({
        name: projectName,
        end_date: dDay,
        content: content,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>새 프로젝트 생성</h2>
        <form onSubmit={handleSubmit}>
          <div className="modal-input-group">
            <label>프로젝트 이름</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="프로젝트 이름을 입력하세요"
              required
            />
          </div>
          <div className="modal-input-group">
            <label>D-Day</label>
            <input
              type="date"
              value={dDay}
              onChange={(e) => setDDay(e.target.value)}
            />
          </div>
          <div className="modal-input-group">
            <label>프로젝트 설명</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="프로젝트에 대한 설명을 입력하세요"
              rows="4"
            />
          </div>
          <div className="modal-buttons">
            <button
              type="button"
              onClick={onClose}
              className="modal-cancel-btn"
            >
              취소
            </button>
            <button type="submit" className="modal-submit-btn">
              생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 업무 생성/수정 폼 컴포넌트
const TaskForm = ({
  initialData,
  onSubmit,
  onCancel,
  formType = "create",
  isLoading,
}) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [status, setStatus] = useState(initialData?.status || "todo");
  const [dueDate, setDueDate] = useState(
    initialData?.due_date
      ? new Date(initialData.due_date).toISOString().split("T")[0]
      : ""
  );
  useEffect(() => {
    setTitle(initialData?.title || "");
    setDescription(initialData?.description || "");
    setStatus(initialData?.status || "todo");
    setDueDate(
      initialData?.due_date
        ? new Date(initialData.due_date).toISOString().split("T")[0]
        : ""
    );
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("업무 제목은 필수입니다.");
      return;
    }
    onSubmit({ title, description, status, due_date: dueDate || null });
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <h3>{formType === "create" ? "새 업무 생성" : "업무 수정/상세"}</h3>
      <div className="form-group">
        <label htmlFor="taskTitle">업무 제목</label>
        <input
          id="taskTitle"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="업무 제목을 입력하세요"
          required
          maxLength="20"
          disabled={formType === "detail"} // 상세 보기 모드에서는 비활성화
        />
      </div>
      <div className="form-group">
        <label htmlFor="taskDescription">업무 내용</label>
        <textarea
          id="taskDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="업무 내용을 입력하세요"
          rows="4"
          disabled={formType === "detail"}
        />
      </div>
      <div className="form-group">
        <label htmlFor="taskStatus">상태</label>
        <select
          id="taskStatus"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={formType === "detail"}
        >
          <option value="todo">할 일 (To Do)</option>
          <option value="doing">진행 중 (In Progress)</option>
          <option value="done">완료 (Done)</option>
          <option value="pending">보류 (Pending)</option>
          {/* 백엔드와 상태값 일치 필요 */}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="taskDueDate">마감일</label>
        <input
          id="taskDueDate"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={formType === "detail"}
        />
      </div>
      <div className="form-buttons">
        <button
          type="button"
          onClick={onCancel}
          className="cancel-btn"
          disabled={isLoading}
        >
          {formType === "detail" ? "목록으로" : "취소"}
        </button>
        {formType !== "detail" && (
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading
              ? "저장 중..."
              : formType === "create"
              ? "생성"
              : "업데이트"}
          </button>
        )}
      </div>
    </form>
  );
};

const MainPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isAlarmMenuOpen, setIsAlarmMenuOpen] = useState(false);
  const [alarms, setAlarms] = useState([]);
  const [alarmCount, setAlarmCount] = useState(0);
  const [selectedTab, setSelectedTab] = useState("메인");
  const [error, setError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [user, _setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user"))
  );
  const [activityLogs, setActivityLogs] = useState([]);
  const [newUsername, setNewUsername] = useState("");
  const [projectUsers, setProjectUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [taskError, setTaskError] = useState(null);
  const [taskSubTab, setTaskSubTab] = useState("목록");
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState(null);

  const fetchTasksByProjectId = useCallback(async (projectId) => {
    if (!projectId) {
      setTasks([]);
      return;
    }
    setIsLoadingTasks(true);
    setTaskError(null);
    try {
      const response = await axios.get(`/api/projects/${projectId}/tasks`);
      const formattedTasks = response.data.map((task) => ({
        ...task,
        title: task.task_name,
        description: task.content,
      }));
      setTasks(formattedTasks);
    } catch (err) {
      console.error("업무 목록 조회 실패:", err);
      setTaskError(
        `업무 목록 로딩 실패: ${err.response?.data?.error || err.message}`
      );
      setTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  const fetchActivityLogs = useCallback(async () => {
    try {
      const res = await axios.get("/api/activity_logs", {
        params: { projectId: selectedProjectId },
      });
      setActivityLogs(res.data);
    } catch (err) {
      console.error("활동 로그 불러오기 실패:", err);
    }
  }, [selectedProjectId]);

  const fetchProjects = useCallback(async () => {
    if (!user || !user.user_id) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/api/projects", {
        params: { userId: user.user_id }, // 서버 API가 요구하는 userId를 쿼리 파라미터로 전달
      });
      setProjects(response.data);
      if (response.data.length > 0) {
        if (
          !selectedProjectId ||
          !response.data.find((p) => p.project_id === selectedProjectId)
        ) {
          const firstProjectId = response.data[0].project_id;
          setSelectedProjectId(firstProjectId);
        }
      } else {
        setSelectedProjectId(null); // 프로젝트가 없으면 선택 해제
        setTasks([]);
        setActivityLogs([]);
      }
    } catch (error) {
      console.error("프로젝트 목록을 불러오는 데 실패했습니다:", error);
      alert("프로젝트 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, selectedProjectId, navigate]);

  //알람 불러오기
  const fetchAlarms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/api/tasks/due_date", {
        params: { userId: user.user_id },
      });
      setAlarms(response.data);
      setAlarmCount(response.data.length);
    } catch (err) {
      console.error("알림을 불러오는 중 오류 발생:", err);
      setError("알림을 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("user"));

    if (loggedInUser && loggedInUser.user_id) {
      fetchAlarms();
      fetchProjects();
    } else {
      navigate("/login");
    }
  }, [navigate, fetchAlarms, fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      if (selectedTab === "업무") {
        if (taskSubTab === "목록") {
          console.log(
            `업무 탭 - 목록 가져오기 호출 (projectId: ${selectedProjectId})`
          );
          fetchTasksByProjectId(selectedProjectId);
        }
      } else if (selectedTab === "로그") {
        console.log(
          `로그 탭 - 로그 가져오기 호출 (projectId: ${selectedProjectId})`
        );
        fetchActivityLogs(selectedProjectId);
      }
    } else {
      setTasks([]);
      setActivityLogs([]);
      console.log("선택된 프로젝트 없음 - 데이터 초기화");
    }
  }, [
    selectedTab,
    selectedProjectId,
    taskSubTab,
    fetchTasksByProjectId,
    fetchActivityLogs,
  ]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR");
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  // CHANGED: 프로젝트 생성 핸들러 (API 호출)
  const handleCreateProject = async (projectData) => {
    if (!user || !user.user_id) {
      alert("사용자 정보가 없습니다. 다시 로그인해주세요.");
      return;
    }

    try {
      const response = await axios.post("/api/projects", {
        name: projectData.name,
        content: projectData.content,
        end_date: projectData.end_date,
        created_by: user.user_id,
      });
      alert(response.data.message);
      await fetchProjects(); // 프로젝트 생성 후 목록을 다시 불러옵니다.
      closeModal();
    } catch (error) {
      console.error("프로젝트 생성 실패:", error);
      alert("프로젝트 생성 중 오류가 발생했습니다.");
    }
  };

  // CHANGED: 프로젝트 삭제 핸들러 (API 호출)
  const handleDeleteProject = async () => {
    if (!selectedProjectId) {
      alert("삭제할 프로젝트를 선택해주세요.");
      return;
    }

    // 현재 로그인된 사용자 정보 가져오기
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.user_id) {
      // 로그인 여부 확인
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    if (
      window.confirm(
        "프로젝트를 삭제하시겠습니까? 관련된 모든 업무와 댓글이 삭제됩니다."
      )
    ) {
      try {
        const response = await axios.delete(
          `/api/projects/${selectedProjectId}`,
          {
            // 요청 본문에 ownerId를 포함하여 보냅니다.
            // 실제 DELETE 요청은 body를 잘 사용하지 않으므로, header나 query parameter로 보내는 것을 권장하지만,
            // 여기서는 간단하게 body로 보내는 예시를 보여줍니다.
            // 더 나은 방법: 요청 헤더에 Authorization 토큰을 보내는 인증 미들웨어 사용 (더 복잡)
            data: { userId: user.user_id }, // <-- 이 부분을 추가합니다.
          }
        );
        alert(response.data.message);
        await fetchProjects();
      } catch (error) {
        console.error("프로젝트 삭제 실패:", error);
        // 서버에서 보낸 에러 메시지가 있다면 사용
        alert(
          error.response?.data?.error || "프로젝트 삭제 중 오류가 발생했습니다."
        );
      }
    }
  };

  const handleAddUserToProject = async () => {
    if (!newUsername || !selectedProjectId) {
      alert("사용자 이름 또는 프로젝트 ID가 없습니다.");
      return;
    }

    try {
      const response = await axios.post(
        `/api/projects/${selectedProjectId}/users`,
        { username: newUsername }
      );
      alert("사용자 추가 성공!");
      setNewUsername("");
      fetchProjectUsers();
    } catch (err) {
      console.error("사용자 추가 실패:", err);
      alert(err.response?.data?.error || "사용자 추가 중 오류 발생");
    }
  };

  const fetchProjectUsers = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const res = await axios.get(`/api/projects/${selectedProjectId}/users`);
      setProjectUsers(res.data);
    } catch (err) {
      console.error("프로젝트 사용자 목록 불러오기 실패:", err);
    }
  }, [selectedProjectId]);

  const handleCreateTaskSubmit = async (taskFormData) => {
    if (!selectedProjectId || !user || !user.user_id) return;
    const apiTaskData = {
      title: taskFormData.title,
      content: taskFormData.description,
      status: taskFormData.status,
      due_date: taskFormData.due_date || null,
      created_by_user_id: user.user_id,
    };
    setIsLoadingTasks(true);
    setTaskError(null);
    try {
      await axios.post(`/api/projects/${selectedProjectId}/tasks`, apiTaskData);
      alert("업무가 성공적으로 생성되었습니다.");
      await fetchTasksByProjectId(selectedProjectId);
      setTaskSubTab("목록");
    } catch (err) {
      console.error("업무 생성 실패:", err);
      setTaskError(
        `업무 생성 실패: ${
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message
        }`
      );
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleUpdateTaskSubmit = async (taskFormData) => {
    if (
      !selectedTaskForEdit ||
      !selectedTaskForEdit.task_id ||
      !user ||
      !user.user_id
    )
      return;
    // API 명세 5.4. UPDATE - /api/tasks/:id (PUT)
    // 요청 body: title, description (content), status, due_date, assigned_to_user_id
    const apiTaskData = {
      title: taskFormData.title,
      description: taskFormData.description, // 백엔드는 'content'로 받을 수 있음. API 확인.
      status: taskFormData.status,
      due_date: taskFormData.due_date || null,
      created_by_user_id: user.user_id,
    };
    setIsLoadingTasks(true);
    setTaskError(null);
    try {
      await axios.put(`/api/tasks/${selectedTaskForEdit.task_id}`, apiTaskData);
      alert("업무가 성공적으로 수정되었습니다.");
      await fetchTasksByProjectId(selectedProjectId);
      setTaskSubTab("목록");
      setSelectedTaskForEdit(null);
    } catch (err) {
      console.error("업무 수정 실패:", err);
      setTaskError(
        `업무 수정 실패: ${
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message
        }`
      );
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleDeleteTask = async (taskIdToDelete) => {
    if (!taskIdToDelete || !user || !user.user_id) return;
    if (window.confirm("정말로 이 업무를 삭제하시겠습니까?")) {
      setIsLoadingTasks(true);
      setTaskError(null);
      try {
        // API 명세 5.5. DELETE - /api/tasks/:id
        // 요청 body로 userId 전달 (백엔드 API가 이를 처리한다고 가정)
        await axios.delete(`/api/tasks/${taskIdToDelete}`, {
          data: { userId: user.user_id },
        });
        alert("업무가 성공적으로 삭제되었습니다.");
        await fetchTasksByProjectId(selectedProjectId);
        if (
          taskSubTab === "상세" &&
          selectedTaskForEdit?.task_id === taskIdToDelete
        ) {
          setTaskSubTab("목록");
          setSelectedTaskForEdit(null);
        }
      } catch (err) {
        console.error("업무 삭제 실패:", err);
        setTaskError(
          `업무 삭제 실패: ${
            err.response?.data?.error ||
            err.response?.data?.message ||
            err.message
          }`
        );
      } finally {
        setIsLoadingTasks(false);
      }
    }
  };

  const toggleAccountMenu = () => setIsAccountMenuOpen(!isAccountMenuOpen);
  const toggleAlarmMenu = () => setIsAlarmMenuOpen(!isAlarmMenuOpen);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const selectedProject = projects.find(
    (p) => p.project_id === selectedProjectId
  );

  return (
    <div>
      <div className="main-container">
        <div className="content-wrapper">
          <nav className="navbar">
            <nav className="navbar">
              <div className="navbar-brand">
                <h1 onClick={() => navigate("/main")}>To Be Continew</h1>
              </div>
              <div className="navbar-controls">
                <div className="alarm-dropdown" onClick={toggleAlarmMenu}>
                  <button className="alarm-btn">
                    🔔
                    {alarmCount > 0 && (
                      <span className="alarm-badge">{alarmCount}</span>
                    )}
                  </button>
                  <div
                    className="alarm-menu"
                    style={{ display: isAlarmMenuOpen ? "block" : "none" }}
                  >
                    {loading ? (
                      <div className="alarm-item">로딩 중...</div>
                    ) : error ? (
                      <div className="alarm-item error">{error}</div>
                    ) : alarmCount > 0 ? (
                      // 데이터가 있을 경우, ul과 li로 목록 렌더링
                      <ul className="alarm-list">
                        <li className="alarm-header">
                          마감 임박 태스크 ({alarmCount}개)
                        </li>
                        {alarms.map((task) => (
                          // map 사용 시 각 항목은 고유한 'key' prop을 가져야 합니다.
                          <li key={task.task_id} className="alarm-item">
                            <div className="task-title">{task.title}</div>
                            <div className="task-due-date">
                              마감일: {formatDate(task.due_date)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="alarm-item">알림이 없습니다.</div>
                    )}
                  </div>
                </div>
                <div className="auth-dropdown" onClick={toggleAccountMenu}>
                  <button className="auth-btn">
                    <span className="material-icons">account_circle</span>
                  </button>
                  <div
                    className="auth-menu"
                    style={{ display: isAccountMenuOpen ? "block" : "none" }}
                  >
                    <button
                      className="auth-menu-item"
                      onClick={() => navigate("/profile")}
                    >
                      <span className="material-icons">person</span>
                      <span>내 정보 변경</span>
                    </button>
                    <button className="auth-menu-item" onClick={handleLogout}>
                      <span className="material-icons">logout</span>
                      <span>로그아웃</span>
                    </button>
                  </div>
                </div>
              </div>
            </nav>
          </nav>
          <aside className="sidebar">
            <div className="sidebar-header">
              <h2>프로젝트 목록</h2>
            </div>
            <nav className="sidebar-nav">
              <ul>
                {/* CHANGED: projects 배열을 순회하며 project.id와 project.name을 사용 */}
                {projects.map((project) => (
                  <li
                    key={project.project_id}
                    className={
                      project.project_id === selectedProjectId ? "active" : ""
                    }
                  >
                    <button
                      className="sidebar-link"
                      onClick={() => setSelectedProjectId(project.project_id)}
                    >
                      {project.project_name}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="sidebar-buttons">
              <button className="sidebar-btn primary" onClick={openModal}>
                프로젝트 <br />
                생성
              </button>
              {/* CHANGED: handleDeleteProject 함수 연결 */}
              <button
                className="sidebar-btn secondary"
                onClick={handleDeleteProject}
              >
                프로젝트 <br />
                삭제
              </button>
            </div>
          </aside>
          <div className="main-content">
            {loading ? (
              <p>프로젝트를 불러오는 중...</p>
            ) : projects.length > 0 && selectedProject ? (
              <div>
                <h1 className="project-title">{selectedProject.name}</h1>
                <div className="content-container">
                  <div className="project-info">
                    {selectedProject !== null && (
                      <div className="action-buttons">
                        <button
                          className="action-btn primary"
                          onClick={() => setSelectedTab("메인")}
                        >
                          메인
                        </button>
                        <button
                          className="action-btn secondary"
                          onClick={() => setSelectedTab("업무")}
                        >
                          업무
                        </button>
                        <button
                          className="action-btn tertiary"
                          onClick={() => setSelectedTab("로그")}
                        >
                          로그
                        </button>
                        <button
                          className="action-btn quaternary"
                          onClick={() => setSelectedTab("알람")}
                        >
                          알람
                        </button>
                        <button
                          className="action-btn quinary"
                          onClick={() => setSelectedTab("사용자")}
                        >
                          사용자
                        </button>
                      </div>
                    )}
                    {selectedProject === null && <p>프로젝트를 선택해주세요</p>}
                  </div>
                  <div className="project-details-content">
                    {/* 메인 화면에서 메인 버튼을 누를 시 뜨는 화면 */}
                    {selectedTab === "메인" && (
                      <div>
                        <h2> 프로젝트 요약 </h2>
                        <p>
                          <strong>프로젝트 마감일:</strong>{" "}
                          {formatDate(selectedProject.end_date)}{" "}
                          <strong style={{ color: "red" }}>
                            ({calculateDDay(selectedProject.end_date)})
                          </strong>
                        </p>
                        <p>
                          <strong>달성률:</strong> {50}%
                        </p>

                        <div className="progress-bar-wrapper">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${50}%` }}
                          ></div>
                        </div>
                        <p>
                          <strong>프로젝트 이름:</strong>{" "}
                          {selectedProject.project_name}
                        </p>
                        <p>
                          <strong>프로젝트 설명:</strong>{" "}
                          {selectedProject.content || "설명이 없습니다."}
                        </p>
                      </div>
                    )}
                    {/* 메인 화면에서 업무 버튼을 누를 시 뜨는 화면 */}
                    {selectedTab === "업무" && (
                      <div className="task-section">
                        <div className="task-subtabs">
                          <button
                            className={taskSubTab === "목록" ? "active" : ""}
                            onClick={() => {
                              setTaskSubTab("목록");
                              setSelectedTaskForEdit(null);
                              // fetchTasksByProjectId(selectedProjectId); // 목록 탭 클릭 시 새로고침
                            }}
                          >
                            업무 목록
                          </button>
                          <button
                            className={taskSubTab === "생성" ? "active" : ""}
                            onClick={() => {
                              setTaskSubTab("생성");
                              setSelectedTaskForEdit(null); // 생성 폼 열 때 수정 상태 초기화
                            }}
                          >
                            새 업무 생성
                          </button>
                          {selectedTaskForEdit && taskSubTab === "상세" && (
                            <button className="active">
                              {" "}
                              {/* 상세/수정 탭은 동적으로만 표시 */}
                              업무 상세/수정
                            </button>
                          )}
                        </div>

                        {taskError && (
                          <p className="error-message">{taskError}</p>
                        )}

                        {taskSubTab === "목록" && (
                          <div className="task-list-container">
                            {isLoadingTasks && tasks.length === 0 ? (
                              <p>업무 목록을 불러오는 중...</p>
                            ) : !isLoadingTasks && tasks.length === 0 ? (
                              <p>
                                등록된 업무가 없습니다. '새 업무 생성' 탭에서
                                추가하세요.
                              </p>
                            ) : (
                              <ul className="task-list">
                                {tasks.map((task) => (
                                  <li key={task.task_id} className="task-item">
                                    <div>
                                      <h3>
                                        {task.title}
                                        <span
                                          className={`status status-${
                                            task.status
                                              ?.toLowerCase()
                                              .replace(/\s+/g, "-") || "unknown"
                                          }`}
                                        >
                                          {task.status || "상태없음"}
                                        </span>
                                      </h3>
                                      <p>{task.description || "내용 없음"}</p>
                                      <small>
                                        생성자ID: {task.created_by_user_id} |
                                        생성일: {formatDate(task.created_at)}
                                        {task.assignees &&
                                          ` | 담당자: ${task.assignees}`}
                                        {task.due_date &&
                                          ` | 마감일: ${formatDate(
                                            task.due_date
                                          )}`}
                                      </small>
                                    </div>
                                    <div className="task-item-actions">
                                      <button
                                        onClick={() => {
                                          setSelectedTaskForEdit(task);
                                          setTaskSubTab("상세"); // '상세' 탭으로 변경
                                        }}
                                        className="edit-btn"
                                      >
                                        수정/상세
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteTask(task.task_id)
                                        }
                                        className="delete-btn"
                                        disabled={isLoadingTasks}
                                      >
                                        삭제
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        {taskSubTab === "생성" && (
                          <TaskForm
                            onSubmit={handleCreateTaskSubmit}
                            onCancel={() => setTaskSubTab("목록")}
                            formType="create"
                            isLoading={isLoadingTasks}
                          />
                        )}

                        {taskSubTab === "상세" && selectedTaskForEdit && (
                          <TaskForm
                            initialData={selectedTaskForEdit}
                            onSubmit={handleUpdateTaskSubmit}
                            onCancel={() => {
                              setTaskSubTab("목록");
                              setSelectedTaskForEdit(null);
                            }}
                            formType="edit" // 'edit' 또는 'detail'로 구분하여 폼 비활성화 제어 가능
                            isLoading={isLoadingTasks}
                          />
                        )}
                      </div>
                    )}

                    {/* 메인 화면에서 로그 버튼을 누를 시 뜨는 화면 */}
                    {selectedTab === "로그" && (
                      <div>
                        <h2>활동 로그</h2>
                        {activityLogs.length === 0 ? (
                          <p>활동 로그가 없습니다.</p>
                        ) : (
                          <ul className="activity-log-list">
                            {activityLogs.map((log) => (
                              <li key={log.log_id}>
                                [
                                {new Date(log.created_at).toLocaleString(
                                  "ko-KR"
                                )}
                                ] {log.action_type} -{" "}
                                {JSON.stringify(log.details)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* 메인 화면에서 알람 버튼을 누를 시 뜨는 화면 */}
                    {selectedTab === "알람" && (
                      <div>
                        <h2> 알람 </h2>
                        {/* 알림 내용 렌더링 */}
                      </div>
                    )}

                    {selectedTab === "사용자" && (
                      <div>
                        <h2>프로젝트 참여자 ({projectUsers.length}명)</h2>
                        <input
                          type="text"
                          placeholder="추가할 사용자 이름 입력"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                        />
                        <button onClick={handleAddUserToProject}>
                          사용자 추가
                        </button>

                        <ul>
                          {projectUsers.length === 0 ? (
                            <li>아직 참여한 사용자가 없습니다.</li>
                          ) : (
                            projectUsers.map((user) => (
                              <li key={user.user_id}>
                                ID: {user.user_id} - 이름: {user.username}
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-projects">
                <h2>프로젝트가 없습니다</h2>
                <p>새로운 프로젝트를 생성해보세요</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <ProjectModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};

export default MainPage;
