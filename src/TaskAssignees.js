// src/components/TaskAssignees.js
import React, { useState } from "react";
// './styles/TaskAssignees.css' // CSS 파일은 MainPage에서 임포트하거나 여기서 직접 임포트

const TaskAssignees = ({
  taskId,
  currentAssignees = [], // {user_id, username} 객체의 배열
  isLoading,
  onAddAssignee,
  onRemoveAssignee,
}) => {
  const [newAssigneeUsername, setNewAssigneeUsername] = useState("");

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (newAssigneeUsername.trim()) {
      onAddAssignee(taskId, newAssigneeUsername);
      setNewAssigneeUsername(""); // 제출 후 입력 필드 초기화
    }
  };

  if (isLoading) {
    return <div className="task-assignees-loading">담당자 정보 로딩 중...</div>;
  }

  return (
    <div className="task-assignees-content">
      <h4>현재 담당자</h4>
      {currentAssignees.length === 0 ? (
        <p className="no-assignees-message">배정된 담당자가 없습니다.</p>
      ) : (
        <ul className="assignees-list">
          {currentAssignees.map((assignee) => (
            <li key={assignee.user_id} className="assignee-item">
              <span>
                {assignee.username} (ID: {assignee.user_id})
              </span>
              <button
                onClick={() => onRemoveAssignee(taskId, assignee.user_id)}
                className="remove-assignee-btn"
                title={`${assignee.username}님을 담당자에서 제외`}
              >
                제외
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAddSubmit} className="add-assignee-form">
        <h4>담당자 추가</h4>
        <div className="form-group-assignee">
          <input
            type="text"
            value={newAssigneeUsername}
            onChange={(e) => setNewAssigneeUsername(e.target.value)}
            placeholder="추가할 담당자 이름 입력"
            className="assignee-input"
          />
          <button type="submit" className="add-assignee-btn">
            추가
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskAssignees;
