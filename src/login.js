import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "./api/axios";
import "./styles/login.css";
import { GoogleLogin, googleLogout } from "@react-oauth/google";

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!username || !password) {
      setError("아이디와 비밀번호를 모두 입력해주세요.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post("/api/login", {
        username,
        password,
      });

      console.log("로그인 성공:", response.data);

      localStorage.setItem("user", JSON.stringify(response.data));

      navigate("/main");
    } catch (err) {
      console.error("로그인 실패:", err);
      if (err.response) {
        setError(
          err.response.data.error || "아이디 또는 비밀번호가 올바르지 않습니다."
        );
      } else {
        setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 구글 로그인 성공 시 호출될 함수
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    setError("");
    setGoogleLoading(true);
    console.log("Google ID Token:", credentialResponse.credential);

    try {
      // 백엔드의 구글 인증 API로 ID 토큰 전송
      const response = await axios.post("/api/auth/google", {
        // 새로운 구글 로그인 API 경로
        token: credentialResponse.credential,
      });

      console.log("구글 로그인 성공 (백엔드 응답):", response.data);
      // 백엔드에서 user_id, username, email 등을 포함한 사용자 객체를 반환한다고 가정
      localStorage.setItem("user", JSON.stringify(response.data.user)); // user 키로 저장
      navigate("/main");
    } catch (err) {
      console.error("구글 로그인 실패:", err);
      if (err.response) {
        setError(
          err.response.data.message || "구글 로그인 중 오류가 발생했습니다."
        );
      } else {
        setError("구글 로그인 서버에 연결할 수 없습니다.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // 구글 로그인 실패 시 호출될 함수
  const handleGoogleLoginError = () => {
    console.error("Google Login Failed on client side");
    setError("구글 로그인에 실패했습니다. 다시 시도해주세요.");
    setGoogleLoading(false);
  };

  return (
    <div className="login-container">
      <h1 className="login-title">to Be Continew</h1>
      <div className="login-box">
        <h2>로그인</h2>
        {error && <div className="login-error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-insert-form">
            <div className="login-form-group">
              <label htmlFor="username">아이디</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="login-form-group">
              <label htmlFor="password">비밀번호</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
        <hr />
        <div className="button-container">
          {/* GoogleLogin 컴포넌트로 교체 */}
          {googleLoading ? (
            <div style={{ textAlign: "center", margin: "10px 0" }}>
              구글 로그인 처리 중...
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
              // useOneTap // 필요에 따라 원탭 UI 사용
              theme="outline" // 버튼 테마
              size="large" // 버튼 크기
              shape="rectangular" // 버튼 모양
              width="240px" // 버튼 너비 (CSS로도 조절 가능)
              containerProps={{
                style: { marginTop: "10px", marginBottom: "10px" },
              }}
            />
          )}
          <button
            className="login-register-link"
            onClick={() => navigate("/register")}
            disabled={loading || googleLoading}
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
