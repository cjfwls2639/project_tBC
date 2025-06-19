import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "./api/axios.js";
import "./styles/MainPage.css";
import "./styles/Sidebar.css";
import "./styles/NavigationBar.css";
import "./styles/MainContent.css";
import TaskComments from "./TaskComments"; // <-- 새 컴포넌트 임포트
import "./styles/TaskComments.css"; // <-- 새 CSS 임포트

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
      // 성공적으로 제출 후 폼 초기화
      setProjectName("");
      setDDay("");
      setContent("");
      onClose(); // 모달 닫기는 onSubmit 콜백에서 처리하거나 여기서 직접 호출
    }
  };

  const handleClose = () => {
    // 폼 상태 초기화 후 모달 닫기
    setProjectName("");
    setDDay("");
    setContent("");
    onClose();
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
              onClick={handleClose} // 수정된 닫기 핸들러 사용
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
          maxLength="20" // 프론트엔드 유효성 검사, 백엔드와 일치 필요
          disabled={formType === "detail"}
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
  const [user, setUser] = useState(() =>
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
  const [openTaskCommentsId, setOpenTaskCommentsId] = useState(null);
  const [taskComments, setTaskComments] = useState({});
  const [isLoadingCommentsTask, setIsLoadingCommentsTask] = useState({});

  const formatDate = (dateString) => {
    if (!dateString) return "없음";
    const date = new Date(dateString);
    return isNaN(date) ? "없음" : date.toLocaleDateString("ko-KR");
  };

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
        // API 응답 필드명에 따라 조정 (task_name -> title, content -> description)
        title: task.task_name,
        description: task.content,
      }));
      setTasks(formattedTasks);
    } catch (err) {
      console.error("업무 목록 조회 실패:", err);
      setTaskError(
        `업무 목록 로딩 실패: ${err.response?.data?.error || err.message}`
      );
      setTasks([]); // 실패 시 빈 배열로 설정
    } finally {
      setIsLoadingTasks(false);
    }
  }, []); // 의존성 배열 비우면 최초 마운트 시에만 생성. axios는 외부 변수이므로 안정적.

  const fetchActivityLogs = useCallback(async (projectIdToFetch) => {
    if (!projectIdToFetch) {
      setActivityLogs([]);
      return;
    }
    try {
      const res = await axios.get("/api/activity_logs", {
        params: { projectId: projectIdToFetch },
      });
      setActivityLogs(res.data);
    } catch (err) {
      console.error("활동 로그 불러오기 실패:", err);
      // setActivityLogs([]); // 실패 시 빈 배열로 설정 (선택 사항)
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    if (!user || !user.user_id) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    setLoading(true); // 프로젝트 목록 로딩 시작
    setError(null);
    try {
      const response = await axios.get("/api/projects", {
        params: { userId: user.user_id },
      });
      setProjects(response.data);
      if (response.data.length > 0) {
        // 이전에 선택된 프로젝트가 없거나, 현재 프로젝트 목록에 없는 경우 첫 번째 프로젝트 선택
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
        setOpenTaskCommentsId(null); // 댓글 상태 초기화
        setTaskComments({});
      }
    } catch (error) {
      console.error("프로젝트 목록을 불러오는 데 실패했습니다:", error);
      setError(
        "프로젝트 목록 로딩 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
      // alert("프로젝트 목록을 불러오는 중 오류가 발생했습니다."); // setError로 대체 가능
      setSelectedProjectId(null);
      setTasks([]);
      setActivityLogs([]);
      setOpenTaskCommentsId(null);
      setTaskComments({});
    } finally {
      setLoading(false); // 프로젝트 목록 로딩 완료
    }
  }, [user, navigate, selectedProjectId]); // selectedProjectId는 조건 확인용, 직접 fetchProjects를 재호출하지 않음

  const fetchProjectUsers = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const res = await axios.get(`/api/projects/${selectedProjectId}/users`);
      setProjectUsers(res.data);
    } catch (err) {
      console.error("프로젝트 사용자 목록 불러오기 실패:", err);
      setProjectUsers([]); // 실패 시 빈 배열로
    }
  }, [selectedProjectId]);

  const fetchAlarms = useCallback(async () => {
    if (!user || !user.user_id) return;
    try {
      const response = await axios.get("/api/tasks/due_date", {
        params: { userId: user.user_id },
      });
      setAlarms(response.data);
      setAlarmCount(response.data.length);
    } catch (err) {
      console.error("알림을 불러오는 중 오류 발생:", err);
      // 알림 로딩 실패는 사용자에게 큰 영향을 주지 않을 수 있으므로, 조용히 처리할 수 있음
      // setError("알림을 불러오는 데 실패했습니다.");
    }
  }, [user]);

  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("user"));
    if (loggedInUser && loggedInUser.user_id) {
      fetchAlarms();
      fetchProjects(); // 사용자 정보가 있으면 프로젝트와 알람 로드
    } else {
      navigate("/login"); // 없으면 로그인 페이지로
    }
  }, [navigate, fetchAlarms, fetchProjects]); // 의존성 배열 유지

  useEffect(() => {
    if (selectedProjectId) {
      // 선택된 프로젝트가 있을 때만 데이터 로드
      if (selectedTab === "업무") {
        // 업무 탭에서는 항상 업무 목록을 다시 불러올 수 있도록 조건 단순화
        // (예: 생성/수정 후 목록 탭으로 돌아올 때 등)
        fetchTasksByProjectId(selectedProjectId);
      } else if (selectedTab === "로그") {
        fetchActivityLogs(selectedProjectId);
      } else if (selectedTab === "사용자") {
        fetchProjectUsers(); // 사용자 탭 선택 시 참여자 목록 로드
      }

      // 탭 변경 시 댓글 창 닫기 (선택 사항: 업무 탭 내에서 서브탭 변경 시에는 유지할 수도 있음)
      if (selectedTab !== "업무") {
        setOpenTaskCommentsId(null);
      }
    } else {
      // 선택된 프로젝트가 없으면 관련 데이터 초기화
      setTasks([]);
      setActivityLogs([]);
      setProjectUsers([]);
      setOpenTaskCommentsId(null);
      setTaskComments({}); // 캐시된 댓글도 초기화
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedTab,
    selectedProjectId,
    fetchTasksByProjectId,
    fetchActivityLogs,
    fetchProjectUsers,
  ]);
  // taskSubTab은 fetchTasksByProjectId가 호출되는 조건에 이미 포함되어 있으므로,
  // 직접적인 의존성으로 추가하지 않아도 될 수 있음 (fetchTasksByProjectId가 subTab 변경 시 호출되도록 설계).

  // 프로젝트 변경 시 댓글 상태 초기화 (더 명시적인 처리)
  useEffect(() => {
    setOpenTaskCommentsId(null);
    setTaskComments({});
    // 프로젝트 변경 시 기본 탭을 '메인'으로 설정하고, 업무 서브탭은 '목록'으로 초기화
    setSelectedTab("메인");
    setTaskSubTab("목록");
  }, [selectedProjectId]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

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
        created_by: user.user_id, // API 명세에 따라 'created_by' 또는 'userId' 등 사용
      });
      alert(response.data.message || "프로젝트가 성공적으로 생성되었습니다.");
      await fetchProjects(); // 프로젝트 목록 새로고침
      // closeModal(); // ProjectModal 컴포넌트 내부에서 호출하도록 변경함 (성공 시 폼 초기화와 함께)
    } catch (error) {
      console.error("프로젝트 생성 실패:", error);
      alert(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "프로젝트 생성 중 오류가 발생했습니다."
      );
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProjectId) {
      alert("삭제할 프로젝트를 선택해주세요.");
      return;
    }
    const currentUser = JSON.parse(localStorage.getItem("user"));
    if (!currentUser || !currentUser.user_id) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    if (
      window.confirm(
        `'${
          selectedProject?.project_name || "선택된"
        }' 프로젝트를 삭제하시겠습니까? 관련된 모든 업무와 댓글이 삭제됩니다.`
      )
    ) {
      try {
        const response = await axios.delete(
          `/api/projects/${selectedProjectId}`,
          {
            data: { userId: currentUser.user_id }, // 백엔드가 요청자 확인을 위해 userId를 필요로 할 경우
          }
        );
        alert(response.data.message || "프로젝트가 성공적으로 삭제되었습니다.");
        // fetchProjects가 새 프로젝트를 선택하거나 null로 설정하도록 함
        await fetchProjects();
      } catch (error) {
        console.error("프로젝트 삭제 실패:", error);
        alert(
          error.response?.data?.error || "프로젝트 삭제 중 오류가 발생했습니다."
        );
      }
    }
  };

  const handleAddUserToProject = async () => {
    if (!newUsername.trim() || !selectedProjectId) {
      alert("추가할 사용자의 이름을 입력해주세요.");
      return;
    }
    try {
      const response = await axios.post(
        `/api/projects/${selectedProjectId}/users`,
        { username: newUsername } // API 명세에 따라 userId 또는 email 등으로 변경 가능
      );
      alert(response.data.message || "사용자가 성공적으로 추가되었습니다.");
      setNewUsername(""); // 입력 필드 초기화
      fetchProjectUsers(); // 사용자 목록 새로고침
    } catch (err) {
      console.error("사용자 추가 실패:", err);
      alert(err.response?.data?.error || "사용자 추가 중 오류가 발생했습니다.");
    }
  };

  const handleCreateTaskSubmit = async (taskFormData) => {
    if (!selectedProjectId || !user || !user.user_id) {
      alert("프로젝트가 선택되지 않았거나 사용자 정보가 없습니다.");
      return;
    }
    const apiTaskData = {
      title: taskFormData.title,
      content: taskFormData.description, // API 필드명 'content'
      status: taskFormData.status,
      due_date: taskFormData.due_date || null,
      created_by_user_id: user.user_id, // API 필드명 확인
    };
    setIsLoadingTasks(true);
    setTaskError(null);
    try {
      await axios.post(`/api/projects/${selectedProjectId}/tasks`, apiTaskData);
      alert("업무가 성공적으로 생성되었습니다.");
      await fetchTasksByProjectId(selectedProjectId); // 업무 목록 새로고침
      setTaskSubTab("목록"); // 목록 탭으로 전환
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
    ) {
      alert("수정할 업무가 선택되지 않았거나 사용자 정보가 없습니다.");
      return;
    }
    const apiTaskData = {
      title: taskFormData.title,
      content: taskFormData.description, // API 필드명 'content'
      status: taskFormData.status,
      due_date: taskFormData.due_date || null,
      // updated_by_user_id: user.user_id, // API에서 필요하다면 추가
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
    if (!taskIdToDelete || !user || !user.user_id) {
      alert("삭제할 업무 ID가 없거나 사용자 정보가 없습니다.");
      return;
    }
    const taskToDelete = tasks.find((t) => t.task_id === taskIdToDelete);
    if (
      window.confirm(
        `'${taskToDelete?.title || "선택된"}' 업무를 정말로 삭제하시겠습니까?`
      )
    ) {
      setIsLoadingTasks(true);
      setTaskError(null);
      try {
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
        if (openTaskCommentsId === taskIdToDelete) {
          setOpenTaskCommentsId(null);
          setTaskComments((prev) => {
            const newState = { ...prev };
            delete newState[taskIdToDelete];
            return newState;
          });
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

  // --- 댓글 관련 새 함수들 ---
  const fetchCommentsForTask = useCallback(async (taskId) => {
    if (!taskId) return;
    setIsLoadingCommentsTask((prev) => ({ ...prev, [taskId]: true }));
    try {
      // 백엔드는 이미 SELECT c.*, u.username ... 로 필요한 데이터를 보내고 있습니다.
      // content 컬럼은 content로, username 컬럼은 username으로 올 것입니다.
      const response = await axios.get(`/api/tasks/${taskId}/comments`);
      setTaskComments((prevComments) => ({
        ...prevComments,
        [taskId]: response.data, // 백엔드에서 온 데이터를 그대로 사용
      }));
    } catch (error) {
      console.error(`${taskId}번 태스크 댓글 로딩 실패:`, error);
      setTaskComments((prevComments) => ({
        ...prevComments,
        [taskId]: [],
      }));
    } finally {
      setIsLoadingCommentsTask((prev) => ({ ...prev, [taskId]: false }));
    }
  }, []); // 의존성 배열은 그대로 유지

  const toggleComments = useCallback(
    async (taskId) => {
      const isOpening = openTaskCommentsId !== taskId;
      setOpenTaskCommentsId(isOpening ? taskId : null);

      if (isOpening) {
        if (!taskComments[taskId] || taskComments[taskId].length === 0) {
          await fetchCommentsForTask(taskId);
        }
      }
    },
    [openTaskCommentsId, taskComments, fetchCommentsForTask]
  );

  // handleSubmitNewComment: 백엔드에 'content' 필드로 데이터를 보냅니다.
  const handleSubmitNewComment = async (taskId, commentText) => {
    // 두 번째 인자 이름을 commentText로 변경 (의미 명확화)
    if (!commentText.trim()) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }
    if (!user || !user.user_id) {
      alert("댓글을 작성하려면 로그인이 필요합니다.");
      return;
    }

    try {
      await axios.post(`/api/tasks/${taskId}/comments`, {
        content: commentText, // 'text' 대신 'content' 필드명 사용
        user_id: user.user_id,
      });
      await fetchCommentsForTask(taskId); // 댓글 목록 새로고침
    } catch (error) {
      console.error(`${taskId}번 태스크 댓글 추가 실패:`, error);
      alert(
        `댓글 추가 실패: ${error.response?.data?.message || error.message}`
      );
    }
  };

  const handleDeleteComment = async (taskId, commentId) => {
    if (!user || !user.user_id) {
      alert("댓글을 삭제하려면 로그인이 필요합니다.");
      return;
    }
    if (!commentId) {
      alert("삭제할 댓글 정보가 없습니다.");
      return;
    }

    // 사용자에게 삭제 확인
    if (window.confirm("이 댓글을 정말로 삭제하시겠습니까?")) {
      try {
        await axios.delete(`/api/comments/${commentId}`, {
          data: { userId: user.user_id },
        });

        alert("댓글이 성공적으로 삭제되었습니다.");
        fetchCommentsForTask(taskId);
      } catch (error) {
        console.error(`댓글(ID: ${commentId}) 삭제 실패:`, error);
        alert(
          `댓글 삭제 중 오류가 발생했습니다: ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }
  };

  const toggleAccountMenu = () => setIsAccountMenuOpen(!isAccountMenuOpen);
  const toggleAlarmMenu = () => setIsAlarmMenuOpen(!isAlarmMenuOpen);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    // ProjectModal 내부에서 폼 초기화를 하도록 변경했으므로 여기서는 호출 불필요
  };

  const selectedProject = projects.find(
    (p) => p.project_id === selectedProjectId
  );

  return (
    <div>
      <div className="main-container">
        <div className="content-wrapper">
          <nav className="navbar">
            <div className="navbar-brand">
              <h1 onClick={() => navigate("/main")}>To Be Continew</h1>
            </div>
            <div className="navbar-controls">
              <div className="alarm-dropdown">
                <button className="alarm-btn" onClick={toggleAlarmMenu}>
                  🔔
                  {alarmCount > 0 && (
                    <span className="alarm-badge">{alarmCount}</span>
                  )}
                </button>
                <div
                  className="alarm-menu"
                  style={{ display: isAlarmMenuOpen ? "block" : "none" }}
                >
                  {/* alarms 로딩 상태를 별도로 관리한다면 loading && alarms.length === 0 대신 alarmsLoading 사용 */}
                  {alarms.length === 0 && !error ? ( // 에러가 없고 알람이 없을 때
                    <div className="alarm-item">알림이 없습니다.</div>
                  ) : error ? ( // 전역 에러 상태를 알람에 표시하는 것은 부적절할 수 있음
                    <div className="alarm-item error">
                      알림 로딩 중 오류가 발생했습니다.
                    </div>
                  ) : (
                    <ul className="alarm-list">
                      <li className="alarm-header">
                        마감 임박 태스크 ({alarmCount}개)
                      </li>
                      {alarms.map((task) => (
                        <li key={task.task_id} className="alarm-item">
                          <div className="task-title">
                            {task.title} ({calculateDDay(task.due_date)})
                          </div>
                          <div className="task-due-date">
                            마감일: {formatDate(task.due_date)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="auth-dropdown">
                <button className="auth-btn" onClick={toggleAccountMenu}>
                  <span className="material-icons">account_circle</span>
                </button>
                <div
                  className="auth-menu"
                  style={{ display: isAccountMenuOpen ? "block" : "none" }}
                >
                  <button
                    className="auth-menu-item"
                    onClick={() => {
                      navigate("/profile");
                      setIsAccountMenuOpen(false);
                    }}
                  >
                    <span className="material-icons">person</span>
                    <span>내 정보 변경</span>
                  </button>
                  <button
                    className="auth-menu-item"
                    onClick={() => {
                      handleLogout();
                      setIsAccountMenuOpen(false);
                    }}
                  >
                    <span className="material-icons">logout</span>
                    <span>로그아웃</span>
                  </button>
                </div>
              </div>
            </div>
          </nav>
          <aside className="sidebar">
            <div className="sidebar-header">
              <h2>프로젝트 목록</h2>
            </div>
            <nav className="sidebar-nav">
              <ul>
                {projects.map((project) => (
                  <li
                    key={project.project_id}
                    className={
                      project.project_id === selectedProjectId ? "active" : ""
                    }
                  >
                    <button
                      className="sidebar-link"
                      onClick={() => {
                        setSelectedProjectId(project.project_id);
                        // 프로젝트 변경 시 관련 상태 초기화는 useEffect([selectedProjectId])에서 처리
                      }}
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
              <button
                className="sidebar-btn secondary"
                onClick={handleDeleteProject}
                disabled={!selectedProjectId || projects.length === 0} // 선택된 프로젝트가 없거나 목록이 비면 비활성화
              >
                프로젝트 <br />
                삭제
              </button>
            </div>
          </aside>
          <div className="main-content">
            {/* 전체 페이지 로딩(주로 프로젝트 목록) 중일 때 */}
            {loading && projects.length === 0 && !error ? (
              <p>프로젝트 목록을 불러오는 중...</p>
            ) : error ? ( // 프로젝트 목록 로딩 에러 발생 시
              <div className="error-message-container">
                <h2>오류 발생</h2>
                <p>{error}</p>
                <button onClick={fetchProjects}>다시 시도</button>
              </div>
            ) : projects.length > 0 && selectedProject ? (
              <div>
                <h1 className="project-title">
                  {selectedProject.project_name}
                </h1>{" "}
                {/* API 응답 필드명 확인 */}
                <div className="content-container">
                  <div className="project-info">
                    <div className="action-buttons">
                      {/* 탭 버튼들: selectedTab 상태에 따라 active 클래스 적용 */}
                      <button
                        className={`action-btn primary ${
                          selectedTab === "메인" ? "active" : ""
                        }`}
                        onClick={() => setSelectedTab("메인")}
                      >
                        메인
                      </button>
                      <button
                        className={`action-btn secondary ${
                          selectedTab === "업무" ? "active" : ""
                        }`}
                        onClick={() => setSelectedTab("업무")}
                      >
                        업무
                      </button>
                      <button
                        className={`action-btn tertiary ${
                          selectedTab === "로그" ? "active" : ""
                        }`}
                        onClick={() => setSelectedTab("로그")}
                      >
                        로그
                      </button>
                      {/* 알람 탭은 전역으로 처리하므로 프로젝트별 알람 탭은 제거 가능 */}
                      {/* <button
                        className={`action-btn quaternary ${selectedTab === "알람" ? "active" : ""}`}
                        onClick={() => setSelectedTab("알람")}
                      >
                        알람
                      </button> */}
                      <button
                        className={`action-btn quinary ${
                          selectedTab === "사용자" ? "active" : ""
                        }`}
                        onClick={() => setSelectedTab("사용자")}
                      >
                        사용자
                      </button>
                    </div>
                  </div>
                  <div className="project-details-content">
                    {selectedTab === "메인" && (
                      <div>
                        <h2> 프로젝트 요약 </h2>
                        <p>
                          <strong>프로젝트 마감일:</strong>{" "}
                          {formatDate(selectedProject.end_date)}{" "}
                          {selectedProject.end_date && (
                            <strong style={{ color: "red" }}>
                              ({calculateDDay(selectedProject.end_date)})
                            </strong>
                          )}
                        </p>
                        <p>
                          <strong>달성률:</strong>{" "}
                          {(() => {
                            if (tasks.length === 0) return "0%";
                            const doneTasks = tasks.filter(
                              (t) => t.status === "done"
                            ).length;
                            return `${Math.round(
                              (doneTasks / tasks.length) * 100
                            )}%`;
                          })()}
                        </p>
                        <div className="progress-bar-wrapper">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: (() => {
                                if (tasks.length === 0) return "0%";
                                const doneTasks = tasks.filter(
                                  (t) => t.status === "done"
                                ).length;
                                return `${Math.round(
                                  (doneTasks / tasks.length) * 100
                                )}%`;
                              })(),
                            }}
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
                    {selectedTab === "업무" && (
                      <div className="task-section">
                        <div className="task-subtabs">
                          <button
                            className={taskSubTab === "목록" ? "active" : ""}
                            onClick={() => {
                              setTaskSubTab("목록");
                              setSelectedTaskForEdit(null); // 수정 상태 초기화
                              // fetchTasksByProjectId(selectedProjectId); // 목록 탭 클릭 시 새로고침 (useEffect에서 이미 처리)
                            }}
                          >
                            업무 목록
                          </button>
                          <button
                            className={taskSubTab === "생성" ? "active" : ""}
                            onClick={() => {
                              setTaskSubTab("생성");
                              setSelectedTaskForEdit(null);
                            }}
                          >
                            새 업무 생성
                          </button>
                          {/* 상세/수정 탭은 selectedTaskForEdit가 있고 taskSubTab이 '상세'일 때만 표시 */}
                          {selectedTaskForEdit && taskSubTab === "상세" && (
                            <button className="active">업무 상세/수정</button>
                          )}
                        </div>

                        {taskError && (
                          <p className="error-message">{taskError}</p>
                        )}

                        {taskSubTab === "목록" && (
                          <div className="task-list-container">
                            {isLoadingTasks && tasks.length === 0 ? ( // 처음 로딩 중일 때
                              <p>업무 목록을 불러오는 중...</p>
                            ) : !isLoadingTasks && tasks.length === 0 ? ( // 로딩 완료 후 업무가 없을 때
                              <p>
                                등록된 업무가 없습니다. '새 업무 생성' 탭에서
                                추가하세요.
                              </p>
                            ) : (
                              <ul className="task-list">
                                {tasks.map((task) => (
                                  <li key={task.task_id} className="task-item">
                                    <div className="task-item-container">
                                      <div className="task-info-main">
                                        {" "}
                                        <h3>
                                          {task.title}
                                          <span
                                            className={`status status-${
                                              task.status
                                                ?.toLowerCase()
                                                .replace(/\s+/g, "-") ||
                                              "unknown"
                                            }`}
                                          >
                                            {task.status === "todo" && "할 일"}
                                            {task.status === "doing" &&
                                              "진행 중"}
                                            {task.status === "done" && "완료"}
                                            {task.status === "pending" &&
                                              "보류"}
                                            {![
                                              "todo",
                                              "doing",
                                              "done",
                                              "pending",
                                            ].includes(task.status) &&
                                              (task.status || "상태없음")}
                                          </span>
                                        </h3>
                                        <p className="task-description-preview">
                                          {task.description || "내용 없음"}
                                        </p>
                                        <small>
                                          생성자ID: {task.created_by_user_id} |
                                          생성일: {formatDate(task.created_at)}
                                          {task.assignees &&
                                            ` | 담당자: ${
                                              Array.isArray(task.assignees)
                                                ? task.assignees.join(", ")
                                                : task.assignees
                                            }`}
                                          {task.due_date &&
                                            ` | 마감일: ${formatDate(
                                              task.due_date
                                            )} (${calculateDDay(
                                              task.due_date
                                            )})`}
                                        </small>
                                      </div>
                                      <div className="task-item-actions">
                                        <button
                                          onClick={() =>
                                            toggleComments(task.task_id)
                                          }
                                          className="comments-btn"
                                        >
                                          댓글{" "}
                                          {taskComments[task.task_id]?.length >
                                          0
                                            ? `(${
                                                taskComments[task.task_id]
                                                  .length
                                              })`
                                            : ""}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedTaskForEdit(task);
                                            setTaskSubTab("상세");
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
                                          disabled={isLoadingTasks} // 작업 중일 때 비활성화
                                        >
                                          삭제
                                        </button>
                                      </div>
                                    </div>
                                    <div
                                      className={`task-comments-wrapper ${
                                        openTaskCommentsId === task.task_id
                                          ? "open"
                                          : ""
                                      }`}
                                    >
                                      {openTaskCommentsId === task.task_id && (
                                        <TaskComments
                                          taskId={task.task_id}
                                          comments={
                                            taskComments[task.task_id] || []
                                          }
                                          isLoading={
                                            isLoadingCommentsTask[
                                              task.task_id
                                            ] || false
                                          }
                                          onAddComment={handleSubmitNewComment}
                                          currentUser={user}
                                          onDeleteComment={handleDeleteComment}
                                        />
                                      )}
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
                            formType="edit"
                            isLoading={isLoadingTasks}
                          />
                        )}
                      </div>
                    )}

                    {selectedTab === "로그" && (
                      <div>
                        <h2>활동 로그</h2>
                        {/* 로그 로딩 상태를 별도로 관리한다면 loading 대신 logLoading 사용 */}
                        {activityLogs.length === 0 && !loading ? (
                          <p>활동 로그가 없습니다.</p>
                        ) : loading && activityLogs.length === 0 ? (
                          <p>활동 로그를 불러오는 중...</p>
                        ) : (
                          <ul className="activity-log-list">
                            {activityLogs.map((log) => (
                              <li key={log.log_id}>
                                [
                                {new Date(log.created_at).toLocaleString(
                                  "ko-KR",
                                  { hour12: false } // 24시간 형식
                                )}
                                ] {log.action_type} -{" "}
                                {typeof log.details === "string"
                                  ? log.details
                                  : JSON.stringify(log.details)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    {/* 알람 탭은 전역 알람으로 이동했으므로 프로젝트별 알람은 불필요 */}
                    {/* {selectedTab === "알람" && (
                      <div>
                        <h2> 알람 </h2>
                      </div>
                    )} */}

                    {selectedTab === "사용자" && (
                      <div>
                        <h2>프로젝트 참여자 ({projectUsers.length}명)</h2>
                        <div className="add-user-form">
                          <input
                            type="text"
                            placeholder="추가할 사용자 이름(또는 ID) 입력"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                          />
                          <button
                            onClick={handleAddUserToProject}
                            disabled={!newUsername.trim()}
                          >
                            사용자 추가
                          </button>
                        </div>

                        {projectUsers.length === 0 ? (
                          <p className="no-users-message">
                            아직 참여한 사용자가 없습니다.
                          </p>
                        ) : (
                          <ul className="project-user-list">
                            {projectUsers.map((pUser) => (
                              <li key={pUser.user_id}>
                                ID: {pUser.user_id} - 이름: {pUser.username}
                                {/* 필요하다면 사용자 제거 버튼 등 추가 */}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // 프로젝트가 하나도 없을 때 (로딩 완료 후)
              <div className="no-projects">
                <h2>프로젝트가 없습니다</h2>
                <p>새로운 프로젝트를 생성해보세요.</p>
                <button
                  className="create-first-project-btn"
                  onClick={openModal}
                >
                  첫 프로젝트 생성하기
                </button>
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
