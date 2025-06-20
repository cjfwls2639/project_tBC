import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "./api/axios.js";
import "./styles/MainPage.css";
import "./styles/Sidebar.css";
import "./styles/NavigationBar.css";
import "./styles/MainContent.css";
import TaskComments from "./TaskComments.js";
import "./styles/TaskComments.css";
import TaskAssignees from "./TaskAssignees.js";
import "./styles/TaskAssingees.css";

// d-day 계산 함수
const calculateDDay = (endDateStr) => {
  if (!endDateStr) return "없음";

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD 형식
  const diff =
    (new Date(endDateStr).getTime() - new Date(todayStr).getTime()) /
    (1000 * 60 * 60 * 24);

  const diffDays = Math.round(diff);

  if (isNaN(diffDays)) return "없음";
  if (diffDays > 0) return `D-${diffDays}`;
  if (diffDays === 0) return "D-DAY";
  return `D+${Math.abs(diffDays)}`;
};


// 프로젝트 생성 모달
const ProjectModal = ({ isOpen, onClose, onSubmit }) => {
  const [projectName, setProjectName] = useState("");
  const [dDay, setDDay] = useState("");
  const [content, setContent] = useState("");
  const isSubmitDisabled = !projectName.trim() && !content.trim() && !dDay?.trim();


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
              <button 
              type="submit" 
              className="modal-submit-btn"
              disabled={isSubmitDisabled}
              >
              생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 프로젝트 수정 모달
const EditProjectModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [projectName, setProjectName] = useState(
    initialData?.project_name || ""
  );
  const [dDay, setDDay] = useState(initialData?.end_date || "");
  const [content, setContent] = useState(initialData?.content || "");
  
  useEffect(() => {
    setProjectName(initialData?.project_name || "");
    setDDay(initialData?.end_date || "");
    setContent(initialData?.content || "");
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (projectName.trim()) {
      onSubmit({ name: projectName, end_date: dDay, content });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>프로젝트 수정</h2>
        <form onSubmit={handleSubmit}>
          <div className="modal-input-group">
            <label>프로젝트 이름</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
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
            <button 
            type="submit"
            className="modal-submit-btn">
              수정
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
        <label htmlFor="taskTitle" className="taskTitleLabel">
          업무 제목
        </label>
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
        <label htmlFor="taskDescription" className="taskDescriptionLabel">
          업무 내용
        </label>
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
        <label htmlFor="taskStatus" className="taskStatusLabel">
          상태
        </label>
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
        <label htmlFor="taskDueDate" className="taskDueDateLabel">
          마감일
        </label>
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
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
  const [taskCommentCounts, setTaskCommentCounts] = useState({});
  const [openAssigneesTaskId, setOpenAssigneesTaskId] = useState(null);
  const [detailedTaskAssignees, setDetailedTaskAssignees] = useState({});
  const [isLoadingAssignees, setIsLoadingAssignees] = useState({});

  // 프로젝트 수정 모달 열기
  const openEditModal = (project) => {
    setEditingProject(project); // 선택한 프로젝트 정보 저장
    setIsEditModalOpen(true); // 수정 모달 열기
  };

  // 프로젝트 수정 모달 닫기
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingProject(null); // 편집 상태 초기화
  };

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
      setProjectUsers([]);
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
    }
  }, [user]);

  const fetchAndSetCommentCount = useCallback(async (taskId) => {
    if (!taskId) return;

    setIsLoadingCommentsTask((prev) => ({ ...prev, [taskId]: true }));
    try {
      const response = await axios.get(`/api/tasks/${taskId}/comments`);
      setTaskCommentCounts((prevCounts) => ({
        ...prevCounts,
        [taskId]: response.data.length,
      }));
    } catch (error) {
      console.error(`댓글 수 로딩 실패 (Task ID: ${taskId}):`, error);
      setTaskCommentCounts((prevCounts) => ({
        ...prevCounts,
        [taskId]: 0, // 실패 시 0으로 표시
      }));
    } finally {
      setIsLoadingCommentsTask((prev) => ({ ...prev, [taskId]: false }));
    }
  }, []);

  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("user"));
    if (loggedInUser && loggedInUser.user_id) {
      fetchAlarms();
      fetchProjects(); // 사용자 정보가 있으면 프로젝트와 알람 로드
    } else {
      navigate("/login"); // 없으면 로그인 페이지로
    }
  }, [navigate, fetchAlarms, fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      if (selectedTab === "업무") {
        fetchTasksByProjectId(selectedProjectId);
      } else if (selectedTab === "로그") {
        fetchActivityLogs(selectedProjectId);
      } else if (selectedTab === "사용자") {
        fetchProjectUsers();
      }

      if (selectedTab !== "업무") {
        setOpenTaskCommentsId(null);
      }
    } else {
      setTasks([]);
      setActivityLogs([]);
      setProjectUsers([]);
      setOpenTaskCommentsId(null);
      setTaskComments({});
    }
  }, [
    selectedTab,
    selectedProjectId,
    fetchTasksByProjectId,
    fetchActivityLogs,
    fetchProjectUsers,
  ]);

  useEffect(() => {
    if (
      selectedProjectId &&
      selectedTab === "업무" &&
      tasks &&
      tasks.length > 0
    ) {
      console.log("업무 탭 활성화, 댓글 수 로딩 시작...");
      tasks.forEach((task) => {
        if (task.task_id && taskCommentCounts[task.task_id] === undefined) {
          fetchAndSetCommentCount(task.task_id);
        }
      });
    }
  }, [
    selectedProjectId,
    selectedTab,
    tasks,
    fetchAndSetCommentCount,
    taskCommentCounts,
  ]);

  useEffect(() => {
    setOpenTaskCommentsId(null);
    setTaskComments({});
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
        created_by: user.user_id,
      });
      alert(response.data.message || "프로젝트가 성공적으로 생성되었습니다.");
      await fetchProjects();
    } catch (error) {
      console.error("프로젝트 생성 실패:", error);
      alert(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "프로젝트 생성 중 오류가 발생했습니다."
      );
    }
  };

   // 서버 시간대를 UTC에서 KST로 조정하는 함수
  const adjustToKST = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const offset = date.getTimezoneOffset(); // KST로 조정
  date.setMinutes(date.getMinutes() - offset);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD 형태로 보정
};

  // 프로젝트 수정 핸들
  const handleEditProject = async (projectData) => {
    if (!editingProject || !editingProject.project_id) return;
  const rawInputDate = projectData.end_date?.trim();
  const adjustedEndDate = rawInputDate
    ? adjustToKST(rawInputDate)
    : editingProject.end_date?.split("T")[0] ?? null;

    try {
        const response = await axios.put(
          `/api/projects/${editingProject.project_id}`,
          {
            name: projectData.name,
            content: projectData.content,
            end_date: adjustedEndDate,
            userId: user.user_id, 
          }
        );

        alert(response.data.message);
        setEditingProject(null);
        await fetchProjects();
        closeEditModal();
    } catch (err) {
        console.error("프로젝트 수정 실패:", err);
        alert(
          err.response?.data?.error || // 백엔드가 error 필드로 줄 경우
          err.response?.data?.message || // message 필드일 수도 있음
          `에러 코드: ${err.response?.status}` || // 403 같은 상태 코드도 출력
          "프로젝트 수정 중 오류가 발생했습니다."
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
         { username: newUsername, requesterId: user.user_id } // API 명세에 따라 userId 또는 email 등으로 변경 가능
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
      content: taskFormData.description,
      status: taskFormData.status,
      due_date: taskFormData.due_date || null,
      requesterId: user.user_id
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

  //담당자 관련 함수들
  const fetchDetailedAssignees = useCallback(async (taskId) => {
    if (!taskId) {
      console.warn("fetchDetailedAssignees: taskId is undefined or null"); // taskId 값 확인
      return;
    }
    const apiUrl = `/api/tasks/${taskId}/assignees`; // 요청 URL 로깅
    console.log(`Fetching assignees from: ${apiUrl}`); // 요청 URL 로깅

    setIsLoadingAssignees((prev) => ({ ...prev, [taskId]: true }));
    try {
      const response = await axios.get(apiUrl); // apiUrl 변수 사용
      setDetailedTaskAssignees((prev) => ({
        ...prev,
        [taskId]: response.data,
      }));
    } catch (error) {
      console.error(
        `Task ID ${taskId}의 담당자 정보 로딩 실패 (URL: ${apiUrl}):`,
        error
      ); // 에러 발생 시 URL 함께 로깅
      console.error(`Task ID ${taskId}의 담당자 정보 로딩 실패:`, error);
      setDetailedTaskAssignees((prev) => ({ ...prev, [taskId]: [] })); // 실패 시 빈 배열로 설정
      // 사용자에게 알림을 줄 수도 있습니다.
      // alert(`담당자 정보 로딩 실패: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoadingAssignees((prev) => ({ ...prev, [taskId]: false }));
    }
  }, []); // axios는 안정적이므로 의존성 배열에 추가하지 않아도 됩니다.

  const toggleAssignees = useCallback(
    async (taskId) => {
      const isOpening = openAssigneesTaskId !== taskId;
      setOpenAssigneesTaskId(isOpening ? taskId : null);

      if (isOpening) {
        // 아직 해당 업무의 상세 담당자 정보가 로드되지 않았거나, 이전에 로드 실패한 경우
        if (
          !detailedTaskAssignees[taskId] ||
          detailedTaskAssignees[taskId].length === 0
        ) {
          await fetchDetailedAssignees(taskId);
        }
      }
    },
    [openAssigneesTaskId, detailedTaskAssignees, fetchDetailedAssignees]
  );

  const handleAddAssigneeToTask = async (taskId, usernameToAdd) => {
    if (!usernameToAdd.trim()) {
      alert("추가할 담당자의 사용자 이름을 입력해주세요.");
      return;
    }
    // 현재 로그인한 사용자 정보 (user 상태 변수)에서 user_id를 가져옴
    if (!user || !user.user_id) {
      alert("담당자를 추가하려면 로그인이 필요합니다. (사용자 정보 없음)"); // 메시지 명확화
      return;
    }

    try {
      await axios.post(
        `/api/tasks/${taskId}/assignees`,
        {
          username: usernameToAdd,
          requesterUserId: user.user_id,
        }
        // 만약 서버에서 req.query로 받도록 수정했다면:
        // { params: { requesterUserId: user.user_id } }
      );
      alert(`'${usernameToAdd}' 사용자가 담당자로 추가되었습니다.`);
      await fetchDetailedAssignees(taskId); // 담당자 목록 새로고침
    } catch (error) {
      console.error(`Task ID ${taskId}에 담당자 추가 실패:`, error);
      alert(
        `담당자 추가 실패: ${
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message
        }`
        // 서버에서 error 필드로 응답을 보내도록 통일하는 것이 좋음
      );
    }
  };

  const handleRemoveAssigneeFromTask = async (
    taskId,
    assigneeUserIdToRemove
  ) => {
    if (!assigneeUserIdToRemove) {
      alert("제외할 담당자 정보가 없습니다.");
      return;
    }
    if (!user || !user.user_id) {
      alert("담당자를 제외하려면 로그인이 필요합니다.");
      return;
    }

    if (window.confirm("이 담당자를 업무에서 제외하시겠습니까?")) {
      try {
        console.log(
          "DELETE /assignees - Sending requesterUserId in params:",
          user.user_id
        );
        await axios.delete(
          `/api/tasks/${taskId}/assignees/${assigneeUserIdToRemove}`,
          {
            params: {
              requesterUserId: user.user_id,
            },
          }
        );
        alert("담당자가 성공적으로 제외되었습니다.");
        await fetchDetailedAssignees(taskId); // 담당자 목록 새로고침
      } catch (error) {
        console.error(
          `Task ID ${taskId}에서 담당자(ID: ${assigneeUserIdToRemove}) 제외 실패:`,
          error
        );
        alert(
          `담당자 제외 실패: ${error.response?.data?.message || error.message}`
        );
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

  const handlePromoteToManager = async (memberId) => {
    if (!selectedProjectId || !user?.user_id) {
      alert("프로젝트가 선택되지 않았거나 사용자 정보가 없습니다.");
      return;
    }
    if (
      window.confirm(
        "이 사용자를 매니저로 지정하시겠습니까? 매니저는 프로젝트 삭제 등 주요 권한을 갖게 됩니다."
      )
    ) {
      try {
        const response = await axios.put(
          `/api/projects/${selectedProjectId}/members/${memberId}`,
          {
            role: "manager",
            requesterId: user.user_id, // 요청자 ID를 보내 권한 확인
          }
        );
        alert(response.data.message);
        fetchProjectUsers(); // 사용자 목록 새로고침
      } catch (err) {
        console.error("매니저 지정 실패:", err);
        alert(
          err.response?.data?.error || "매니저 지정 중 오류가 발생했습니다."
        );
      }
    }
  };

  
  const handleDemoteToMember = async (memberId) => {
    if (!selectedProjectId || !user?.user_id) {
      alert("프로젝트가 선택되지 않았거나 사용자 정보가 없습니다.");
      return;
    }
    const memberToDemote = projectUsers.find((u) => u.user_id === memberId);
    if (
      window.confirm(
        `'${memberToDemote?.username}'님을 'member' 등급으로 강등하시겠습니까?`
      )
    ) {
      try {
        const response = await axios.put(
          `/api/projects/${selectedProjectId}/members/${memberId}`,
          {
            role: "member", // 역할을 'member'로 지정
            requesterId: user.user_id,
          }
        );
        alert(response.data.message);
        fetchProjectUsers(); // 사용자 목록 새로고침
      } catch (err) {
        console.error("멤버 강등 실패:", err);
        alert(err.response?.data?.error || "멤버 강등 중 오류가 발생했습니다.");
      }
    }
  };

  const handleRemoveMember = async (memberId, memberUsername) => {
    if (!selectedProjectId || !user?.user_id) {
      alert("프로젝트가 선택되지 않았거나 사용자 정보가 없습니다.");
      return;
    }

    if (window.confirm(`정말로 '${memberUsername}'님을 프로젝트에서 제외하시겠습니까?`)) {
      try {
        await axios.delete(
          `/api/projects/${selectedProjectId}/members/${memberId}`,
          {
            // DELETE 요청 시 body는 'data' 객체 안에 넣어야 합니다.
            data: { requesterId: user.user_id } 
          }
        );
        alert(`'${memberUsername}'님이 프로젝트에서 제외되었습니다.`);
        fetchProjectUsers(); // 사용자 목록 새로고침
        fetchActivityLogs(selectedProjectId); // 활동 로그 새로고침
      } catch (err) {
        console.error("멤버 제외 실패:", err);
        alert(err.response?.data?.error || "멤버 제외 중 오류가 발생했습니다.");
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

  // ***** (새로운 기능) 현재 사용자가 매니저인지 확인하는 변수 *****
  const isCurrentUserProjectManager =
    selectedProject?.role_in_project === "manager";
  

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
                        <h2> 프로젝트 요약
                          <button
                          className="edit-project-btn"
                          style={{ marginLeft: "10px" }}
                          onClick={() => openEditModal(selectedProject)}
                        >
                          수정
                        </button> </h2>
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
                                            toggleAssignees(task.task_id)
                                          }
                                          className="assignees-btn" // 이 클래스에 대한 스타일을 추가하거나 기존 버튼 스타일 활용
                                        >
                                          담당자
                                          {detailedTaskAssignees[
                                            task.task_id
                                          ] &&
                                          detailedTaskAssignees[task.task_id]
                                            .length > 0
                                            ? ` (${
                                                detailedTaskAssignees[
                                                  task.task_id
                                                ].length
                                              })`
                                            : ""}
                                        </button>
                                        <button
                                          onClick={() =>
                                            toggleComments(task.task_id)
                                          }
                                          className="comments-btn"
                                        >
                                          댓글{" "}
                                          {taskCommentCounts[task.task_id] !==
                                            undefined &&
                                          taskCommentCounts[task.task_id] > 0
                                            ? `(${
                                                taskCommentCounts[task.task_id]
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
                                      className={`task-assignees-wrapper ${
                                        openAssigneesTaskId === task.task_id
                                          ? "open"
                                          : ""
                                      }`}
                                    >
                                      {openAssigneesTaskId === task.task_id && (
                                        <TaskAssignees
                                          taskId={task.task_id}
                                          currentAssignees={
                                            detailedTaskAssignees[
                                              task.task_id
                                            ] || []
                                          }
                                          isLoading={
                                            isLoadingAssignees[task.task_id] ||
                                            false
                                          }
                                          onAddAssignee={
                                            handleAddAssigneeToTask
                                          }
                                          onRemoveAssignee={
                                            handleRemoveAssigneeFromTask
                                          }
                                        />
                                      )}
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
                                <span>
                                  ID: {pUser.user_id} - 이름: {pUser.username} - 역할: {pUser.role_in_project}
                                  {/* 생성자(Creator) 표시 */}
                                  {selectedProject?.created_by === pUser.user_id && <strong style={{color: 'purple', marginLeft: '5px'}}>(생성자)</strong>}
                                </span>
                                
                                <div style={{marginLeft: 'auto', display: 'flex', gap: '10px'}}>
                                  {/* --- 버튼 렌더링 조건 --- */}

                                  {/* '매니저로 지정' 버튼 */}
                                  {isCurrentUserProjectManager && pUser.role_in_project === 'member' && (
                                    <button 
                                        onClick={() => handlePromoteToManager(pUser.user_id)}
                                        className="promote-manager-btn"
                                    >
                                        매니저로 지정
                                    </button>
                                  )}

                                  {/* '멤버로 강등' 버튼 */}
                                  {isCurrentUserProjectManager && pUser.role_in_project === 'manager' && user.user_id !== pUser.user_id && pUser.user_id !== selectedProject.created_by && (
                                      <button 
                                          onClick={() => handleDemoteToMember(pUser.user_id)}
                                          className="demote-member-btn"
                                      >
                                          멤버로 강등
                                      </button>
                                  )}

                                  {/* '삭제' 버튼 (새로 추가) */}
                                  {/* 조건: (나는 매니저) AND (대상은 내가 아님) AND (대상은 생성자가 아님) */}
                                  {isCurrentUserProjectManager && user.user_id !== pUser.user_id && pUser.user_id !== selectedProject.created_by && (
                                      <button 
                                          onClick={() => handleRemoveMember(pUser.user_id, pUser.username)}
                                          className="remove-member-btn"
                                          style={{backgroundColor: '#c0392b'}} // 빨간색 계열
                                      >
                                          삭제
                                      </button>
                                  )}
                                </div>
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
      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSubmit={handleEditProject}
        initialData={editingProject}
      />
    </div>
  );
};

export default MainPage;
