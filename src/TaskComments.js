// TaskComments.jsx
import React, { useState } from "react";

const TaskComments = ({
  taskId,
  comments = [],
  isLoading,
  onAddComment,
  currentUser,
  onDeleteComment,
}) => {
  const [newCommentText, setNewCommentText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newCommentText.trim() && currentUser?.user_id) {
      onAddComment(taskId, newCommentText); // newCommentText는 MainPage의 handleSubmitNewComment로 전달됨
      setNewCommentText("");
    } else if (!currentUser?.user_id) {
      alert("댓글을 작성하려면 로그인이 필요합니다.");
    } else if (!newCommentText.trim()) {
      alert("댓글 내용을 입력해주세요.");
    }
  };

  return (
    <div className="task-comments-container">
      <h4>댓글</h4>
      <div className="comments-scrollable-area">
        {isLoading && comments.length === 0 ? (
          <p>댓글 로딩 중...</p>
        ) : (
          <ul className="comment-list">
            {comments.length === 0 && !isLoading ? (
              <li>
                <p>아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
              </li>
            ) : (
              comments.map((comment) => (
                <li key={comment.comment_id} className="comment-item">
                  {" "}
                  <div className="comment-header">
                    <strong>
                      {comment.username || `사용자 ${comment.user_id}`}
                    </strong>
                    <div className="comment-meta">
                      <span className="comment-date">
                        {new Date(comment.created_at).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {currentUser &&
                        currentUser.user_id === comment.user_id &&
                        onDeleteComment && (
                          <button
                            onClick={() =>
                              onDeleteComment(taskId, comment.comment_id)
                            }
                            className="comment-delete-btn"
                            title="댓글 삭제"
                          >
                            삭제
                          </button>
                        )}
                    </div>
                  </div>
                  <p className="comment-text">{comment.content}</p>
                </li>
              ))
            )}
          </ul>
        )}
        <form onSubmit={handleSubmit} className="comment-form">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder={
              currentUser?.user_id
                ? "댓글을 입력하세요..."
                : "로그인 후 댓글을 작성할 수 있습니다."
            }
            rows="3"
            disabled={!currentUser?.user_id}
          />
          <button
            type="submit"
            disabled={!newCommentText.trim() || !currentUser?.user_id}
          >
            댓글 등록
          </button>
        </form>
      </div>
    </div>
  );
};

export default TaskComments;
