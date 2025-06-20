const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const db = require("./db");
const { OAuth2Client } = require("google-auth-library");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const GOOGLE_CLIENT_ID =
  "832194991147-jesr1urnhqk5ul4h4ri1o6puhlh38vuh.apps.googleusercontent.com"; // 실제 클라이언트 ID로 교체
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// 활동 로그 기록 함수
// 활동 로그 기록 함수 (오류 수정 버전)
const logActivity = async (
  db_connection,
  userId,
  projectId,
  taskId,
  actionType,
  details
) => {
  const sql =
    "INSERT INTO activity_logs (user_id, project_id, task_id, action_type, details) VALUES (?, ?, ?, ?, ?)";
  
  // 파라미터를 5개 순서대로 배열에 담습니다.
  const params = [
    userId,
    projectId,
    taskId, // taskId는 null일 수 있습니다.
    actionType,
    JSON.stringify(details), // details 객체를 여기서 문자열로 변환합니다.
  ];

  try {
    // query 함수는 sql과 params 두 개의 인자만 받습니다.
    await db_connection.query(sql, params);
    console.log(`Activity logged: ${actionType}`);
  } catch (err) {
    console.error("Error logging activity:", err);
  }
};

// --- 1. 사용자 인증 API (Users) ---

// 회원가입 (Register) - 스키마에 맞게 컬럼명 수정
app.post("/api/register", async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res
      .status(400)
      .json({ error: "사용자 이름, 비밀번호, 이메일을 모두 입력해주세요." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // 테이블명 'users', 컬럼명 'password' 사용
    const sql =
      "INSERT INTO users (username, password, email) VALUES (?, ?, ?)";
    db.query(sql, [username, hashedPassword, email], (err, result) => {
      if (err) {
        console.error("Error registering user:", err);
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ error: "이미 존재하는 사용자 이름 또는 이메일입니다." });
        }
        return res
          .status(500)
          .json({ error: "회원가입 중 오류가 발생했습니다." });
      }
      res.status(201).json({ message: "회원가입 성공!", id: result.insertId }); // 'user_id' -> 'id'
    });
  } catch (hashError) {
    console.error("Error hashing password:", hashError);
    res.status(500).json({ error: "비밀번호 처리 중 오류가 발생했습니다." });
  }
});

// 로그인 (Login) - 스키마에 맞게 컬럼명 수정
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "사용자 이름과 비밀번호를 입력해주세요." });
  }

  // 테이블명 'users', 컬럼명 'user_id', 'password' 사용
  const sql =
    "SELECT user_id, username, password, email FROM users WHERE username = ?";
  db.query(sql, [username], async (err, results) => {
    if (err) {
      console.error("Error finding user:", err);
      return res.status(500).json({ error: "로그인 중 오류가 발생했습니다." });
    }
    if (results.length === 0) {
      return res.status(401).json({ error: "사용자를 찾을 수 없습니다." });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "비밀번호가 일치하지 않습니다." });
    }

    res.json({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
    });
  });
});

// --- Google 로그인 인증 API ---
app.post("/api/auth/google", async (req, res) => {
  const { token } = req.body; // 프론트에서 보낸 ID 토큰

  if (!token) {
    return res.status(400).json({ message: "ID token not provided." });
  }

  try {
    // ID 토큰 검증
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const googleUserId = payload.sub; // 구글 사용자의 고유 ID
    const email = payload.email;
    const name = payload.name;
    // const picture = payload.picture; // 프로필 사진 URL, 필요시 사용

    // 1. DB에서 이메일로 사용자 찾기
    const findUserSql =
      "SELECT user_id, username, email FROM users WHERE email = ?";
    db.query(findUserSql, [email], async (err, results) => {
      if (err) {
        console.error("Error finding user by email:", err);
        return res.status(500).json({ message: "서버 오류가 발생했습니다." });
      }

      if (results.length > 0) {
        // 2. 이미 가입된 사용자 (이메일 기준)
        const existingUser = results[0];
        console.log("Google Login: Existing user found", existingUser);
        return res.json({
          message: "Google 로그인 성공 (기존 사용자)",
          user: {
            user_id: existingUser.user_id,
            username: existingUser.username,
            email: existingUser.email,
          },
        });
      } else {
        const newUsername = name || email.split("@")[0];
        const randomPasswordForGoogleUser = Math.random()
          .toString(36)
          .slice(-8); // 예시
        const hashedPassword = await bcrypt.hash(
          randomPasswordForGoogleUser,
          10
        ); // 임의 값 해싱

        const registerSql =
          "INSERT INTO users (username, password, email) VALUES (?, ?, ?)";
        db.query(
          registerSql,
          [newUsername, hashedPassword, email],
          (regErr, regResult) => {
            if (regErr) {
              console.error("Error registering new Google user:", regErr);
              return res.status(500).json({
                message: "Google 사용자 등록 중 오류가 발생했습니다.",
              });
            }
            console.log("Google Login: New user registered", {
              id: regResult.insertId,
              username: newUsername,
              email,
            });
            res.status(201).json({
              message: "Google 로그인 및 신규 가입 성공",
              user: {
                // 프론트엔드 localStorage에 저장될 형식과 맞추세요
                user_id: regResult.insertId,
                username: newUsername,
                email: email,
              },
            });
          }
        );
      }
    });
  } catch (error) {
    console.error("Error verifying Google ID token:", error);
    res
      .status(401)
      .json({ message: "Google 인증에 실패했습니다.", details: error.message });
  }
});

// 특정 사용자 정보 조회 (READ)
app.get("/api/users/:id", (req, res) => {
  const userId = req.params.id;

  const sql =
    "SELECT user_id, username, email, created_at FROM users WHERE user_id = ?";

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching user:", err);
      return res
        .status(500)
        .json({ error: "사용자 정보 조회 중 오류가 발생했습니다." });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    res.json(results[0]);
  });
});

// --- 2. 프로젝트 API (Projects) ---

// 2.1. 새로운 프로젝트 생성 (CREATE)
app.post("/api/projects", async (req, res) => {
  const { name, content, end_date, created_by } = req.body;
  if (!name || !created_by) {
    return res.status(400).json({ error: "프로젝트 이름을 입력 해주세요." });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // 1. projects 테이블에 프로젝트 생성
    const projectSql =
      "INSERT INTO projects (project_name, content, end_date, created_by) VALUES (?, ?, ?, ?)";
    const [projectResult] = await connection.query(projectSql, [
      name,
      content,
      end_date,
      created_by,
    ]);
    const projectId = projectResult.insertId;

    // 2. project_members 테이블에 소유자를 'manager'로 추가
    const memberSql =
      "INSERT INTO project_members (project_id, user_id, role_in_project) VALUES (?, ?, ?)";
    await connection.query(memberSql, [projectId, created_by, "manager"]);

    // 3. 활동 로그 기록
    await logActivity(
      connection,
      created_by,
      projectId,
      null,
      "프로젝트 생성",
      { projectName: name } 
    );

    await connection.commit();
    res.status(201).json({
      message: "프로젝트가 성공적으로 생성되었습니다.",
      id: projectId,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Error creating project:", err);
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "존재하지 않는 소유자 ID입니다." });
    }
    res.status(500).json({ error: "프로젝트 생성 중 오류가 발생했습니다." });
  } finally {
    connection.release();
  }
});

// 2.2. 특정 사용자가 참여중인 모든 프로젝트 목록 가져오기 (READ ALL FOR USER)
app.get("/api/projects", (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res
      .status(400)
      .json({ error: "사용자 ID(userId) 쿼리 파라미터가 필요합니다." });
  }
  // project_members 테이블과 JOIN하여 해당 사용자가 속한 프로젝트만 조회
  // p = projects 테이블, u = users 테이블, pm= project_members 테이블
  // owner_name = u.username
  const sql = `
        SELECT p.*, u.username as owner_name, pm.role_in_project
        FROM projects as p
        JOIN users as u ON p.created_by = u.user_id
        JOIN project_members as pm ON p.project_id = pm.project_id
        WHERE pm.user_id = ?
        ORDER BY p.created_at DESC
    `;
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching projects:", err);
      return res
        .status(500)
        .json({ error: "프로젝트 목록을 불러오는 중 오류가 발생했습니다." });
    }
    res.json(results);
  });
});

// 2.3. 특정 프로젝트 상세 정보 가져오기 (READ ONE)
app.get("/api/projects/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Promise.all을 사용하여 프로젝트 정보와 멤버 목록을 병렬로 조회
    const [projectPromise, membersPromise] = await Promise.all([
      db
        .promise()
        .query(
          "SELECT p.*, u.username as owner_name FROM projects as p JOIN users as u ON p.owner_id = u.user_id WHERE p.project_id = ?",
          [id]
        ),
      db
        .promise()
        .query(
          "SELECT u.user_id, u.username, u.email, pm.role_in_project FROM project_members as pm JOIN users as u ON pm.user_id = u.user_id WHERE pm.project_id = ?",
          [id]
        ),
    ]);

    const [projectResult] = projectPromise;
    const [membersResult] = membersPromise;

    if (projectResult.length === 0) {
      return res.status(404).json({ message: "프로젝트를 찾을 수 없습니다." });
    }

    res.json({
      project: projectResult[0],
      members: membersResult,
    });
  } catch (err) {
    console.error("Error fetching project details:", err);
    res
      .status(500)
      .json({ error: "프로젝트 상세 정보를 불러오는 중 오류가 발생했습니다." });
  }
});

// 2.4. 프로젝트 정보 수정 (UPDATE)
app.put("/api/projects/:id", async (req, res) => {
  const { id } = req.params;
  const { name, content, end_date, userId } = req.body;

  if (!name || !userId) {
    return res.status(400).json({ error: "프로젝트 이름과 사용자 ID는 필수입니다." });
  }

  const connection = await db.promise().getConnection();
  try {
    // 프로젝트 매니저인지 확인
    const [rows] = await connection.query(
      "SELECT role_in_project FROM project_members WHERE project_id = ? AND user_id = ?",
      [id, userId]
    );
    if (rows.length === 0 || rows[0].role_in_project !== 'manager') {
      return res.status(403).json({ error: "프로젝트 매니저만 수정할 수 있습니다." });
    }

    // 실제 수정
    const sql = "UPDATE projects SET project_name = ?, content = ?, end_date = ? WHERE project_id = ?";
    const [result] = await connection.query(sql, [name, content, end_date, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "변경된 내용이 없습니다." });
    }

    await logActivity(
      connection,
      userId,
      parseInt(id),
      null,
      "프로젝트 수정",
      {
        updatedName: name,
        updatedContent: content,
        updatedEndDate: end_date,
      }
    );

    res.json({ message: "프로젝트가 성공적으로 수정되었습니다." });
  } catch (err) {
    console.error("프로젝트 수정 중 오류 발생:", err);
    res.status(500).json({ error: "프로젝트 수정 중 오류가 발생했습니다." });
  } finally {
    connection.release();
  }
});

// 2.5. 프로젝트 삭제 (DELETE) - 연관 데이터 모두 삭제하도록 수정
app.delete("/api/projects/:id", async (req, res) => {
  const { id: projectId } = req.params; // 변수명을 projectId로 명확하게 변경
  const { userId } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "인증되지 않은 사용자입니다." });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // 1. 권한 확인 (매니저 여부)
    const [memberRows] = await connection.query(
      "SELECT role_in_project FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, userId]
    );
    if (memberRows.length === 0 || memberRows[0].role_in_project !== 'manager') {
      await connection.rollback();
      return res.status(403).json({ error: "프로젝트 매니저만 삭제할 수 있습니다." });
    }

    // --- 삭제 순서가 매우 중요합니다 ---
    // 프로젝트에 속한 모든 업무 ID를 가져옵니다.
    const [tasksToDelete] = await connection.query("SELECT task_id FROM tasks WHERE project_id = ?", [projectId]);
    const taskIds = tasksToDelete.map(t => t.task_id);

    if (taskIds.length > 0) {
      // 2. 업무에 연결된 자식 데이터 삭제 (comments, task_assignees)
      await connection.query("DELETE FROM comments WHERE task_id IN (?)", [taskIds]);
      await connection.query("DELETE FROM task_assignees WHERE task_id IN (?)", [taskIds]);
      
      // 3. 업무(tasks) 자체를 삭제
      await connection.query("DELETE FROM tasks WHERE project_id = ?", [projectId]);
    }

    // 4. 프로젝트에 연결된 다른 자식 데이터 삭제 (project_members, activity_logs)
    // activity_logs와 project_members는 이미 ON DELETE CASCADE 이므로, 아래 두 줄은 생략 가능하나 명시적으로 실행해도 무방합니다.
    await connection.query("DELETE FROM activity_logs WHERE project_id = ?", [projectId]);
    await connection.query("DELETE FROM project_members WHERE project_id = ?", [projectId]);

    // 5. 모든 자식 데이터가 정리된 후, 최종적으로 프로젝트를 삭제
    const [deleteResult] = await connection.query(
      "DELETE FROM projects WHERE project_id = ?",
      [projectId]
    );

    if (deleteResult.affectedRows === 0) {
      throw new Error("삭제할 프로젝트를 찾지 못했습니다.");
    }

    await connection.commit();
    res.json({ message: "프로젝트와 관련된 모든 데이터가 성공적으로 삭제되었습니다." });

  } catch (err) {
    await connection.rollback();
    console.error("Error deleting project and its related data:", err);
    res.status(500).json({ error: "프로젝트 삭제 중 오류가 발생했습니다." });
  } finally {
    connection.release();
  }
});

// --- 3. 알람 API (Tasks) ---

// 3. 알람 불러오기
app.get("/api/tasks/due_date", (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res
      .status(400)
      .json({ error: "사용자 ID(userId) 쿼리 파라미터가 필요합니다." });
  }

  // due_date가 오늘부터 7일 이내이면서 해당 userId에게 할당된 태스크를 조회합니다.
  // CURDATE(): 현재 날짜를 반환하는 SQL 함수 (MySQL 기준)
  // INTERVAL 7 DAY: 현재 날짜에 7일을 더하는 연산
  // BETWEEN A AND B: A와 B 사이에 있는 값 (A와 B 포함)
  const sql = `
    SELECT t.*
    FROM tasks t
    JOIN task_assignees ta ON t.task_id = ta.task_id
    WHERE ta.user_id = ?
      AND t.due_date IS NOT NULL
      AND t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    ORDER BY t.due_date ASC;
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching tasks due soon:", err);
      return res
        .status(500)
        .json({ error: "알림 목록을 불러오는 중 오류가 발생했습니다." });
    }
    res.json(results);
  });
});

const nodemailer = require("nodemailer");
const crypto = require("crypto"); // Node.js 내장 모듈

// --- 4. 비밀번호 재설정 API ---

// --- 4.1. 비밀번호 재설정 요청 처리 API ---
app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // 1. 이메일로 사용자 찾기
    const [users] = await db
      .promise()
      .query("SELECT * FROM users WHERE email = ?", [email]);

    if (users.length === 0) {
      // 보안을 위해, 이메일이 존재하지 않아도 성공한 것처럼 응답합니다.
      // (악의적인 사용자가 어떤 이메일이 가입되어 있는지 추측하는 것을 막기 위함)
      return res.json({
        message:
          "비밀번호 재설정 이메일을 보냈습니다. 받은 편지함을 확인해주세요.",
      });
    }
    const user = users[0];

    // 2. 보안 토큰 생성
    const token = crypto.randomBytes(20).toString("hex");

    // 3. 토큰 만료 시간 설정 (예: 1시간 후)
    const expires = new Date(Date.now() + 3600000); // 1시간 = 3600 * 1000 ms

    // 4. DB에 토큰과 만료 시간 저장
    await db
      .promise()
      .query(
        "UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE user_id = ?",
        [token, expires, user.user_id]
      );

    // 5. 이메일 발송 설정 (Nodemailer)
    const transporter = nodemailer.createTransport({
      service: "gmail", // 예: Gmail. 실제 서비스에서는 SendGrid, Mailgun 등 추천
      auth: {
        user: process.env.GMAIL_ADDRESS, // 실제 이메일 주소
        pass: process.env.GMAIL_PASSWORD, // Gmail 앱 비밀번호 (보안 설정 필요)
      },
    });

    const resetURL = `http://localhost:3000/reset-password/${token}`; // 프론트엔드 주소

    const mailOptions = {
      to: user.email,
      from: process.env.GMAIL_ADDRESS,
      subject: "비밀번호 재설정 요청",
      text: `비밀번호를 재설정하려면 다음 링크를 클릭하세요:\n\n${resetURL}\n\n이 링크는 1시간 동안 유효합니다.`,
    };

    // 6. 이메일 발송
    await transporter.sendMail(mailOptions);

    res.json({
      message:
        "비밀번호 재설정 이메일을 보냈습니다. 받은 편지함을 확인해주세요.",
    });
  } catch (err) {
    console.error("비밀번호 재설정 요청 처리 중 오류:", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// --- 4.2. 새 비밀번호로 업데이트하는 API ---
app.post("/api/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // 1. 토큰으로 사용자 찾기 (만료 시간도 확인)
    const [users] = await db
      .promise()
      .query(
        "SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()",
        [token]
      );

    if (users.length === 0) {
      return res.status(400).json({
        error: "비밀번호 재설정 토큰이 유효하지 않거나 만료되었습니다.",
      });
    }
    const user = users[0];

    // 2. 새 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. DB 업데이트 (비밀번호 변경 및 토큰 정보 삭제)
    await db
      .promise()
      .query(
        "UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE user_id = ?",
        [hashedPassword, user.user_id]
      );

    res.json({ message: "비밀번호가 성공적으로 변경되었습니다." });
  } catch (err) {
    console.error("비밀번호 변경 중 오류:", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// --- 5. 업무 API (Tasks) ---

// 5.1. 특정 프로젝트의 모든 업무 가져오기 (READ ALL FROM PROJECT)
app.get("/api/projects/:projectId/tasks", (req, res) => {
  const { projectId } = req.params;
  const sql = `
        SELECT t.*, GROUP_CONCAT(u.username SEPARATOR ', ') AS assignees
        FROM tasks as t LEFT JOIN task_assignees as ta ON t.task_id = ta.task_id
        LEFT JOIN users as u ON ta.user_id = u.user_id
        WHERE t.project_id = ?
        GROUP BY t.task_id
        ORDER BY t.created_at DESC;
    `;

  db.query(sql, [projectId], (err, results) => {
    if (err) {
      console.error(`Error fetching tasks for project ${projectId}:`, err);
      return res
        .status(500)
        .json({ error: "업무 목록을 불러오는 중 오류가 발생했습니다." });
    }
    res.json(results);
  });
});

// 5.2. 새로운 업무 생성 (CREATE)
app.post("/api/projects/:projectId/tasks", async (req, res) => {
  const { projectId } = req.params;
  const { title, content, status, due_date, created_by_user_id } = req.body;

  if (!title || !created_by_user_id) {
    return res
      .status(400)
      .json({ error: "업무 제목과 생성자 ID는 필수입니다." });
  }

  let connection;
  try {
    // 1. DB 풀에서 커넥션 가져오기
    connection = await db.promise().getConnection();
    // 2. 트랜잭션 시작
    await connection.beginTransaction();

    // 3. 'tasks' 테이블에 새 업무 삽입
    const taskInsertSql = `
        INSERT INTO tasks
        (project_id, task_name, content, due_date, status, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [taskResult] = await connection.execute(taskInsertSql, [
      projectId,
      title,
      content,
      due_date || null,
      status || "todo", // DB ENUM 기본값 'todo'와 일치 또는 프론트에서 보낸 값
      created_by_user_id,
    ]);

    const newTaskId = taskResult.insertId;

    // 4. 'task_assignees' 테이블에 생성자를 담당자로 삽입
    const assigneeInsertSql = `
      INSERT INTO task_assignees (task_id, user_id)
      VALUES (?, ?)
    `;
    // user_id에 업무 생성자인 created_by_user_id 값을 사용
    await connection.execute(assigneeInsertSql, [
      newTaskId,
      created_by_user_id,
    ]);

    // 5. 활동 로그 기록 (logActivity 함수는 트랜잭션과 별개로 실행되거나, connection을 받을 수 있도록 수정 필요)
    await logActivity(
      connection,
      created_by_user_id,
      parseInt(projectId),
      newTaskId,
      "업무 생성",
      { taskName: title }
    );

    // 6. 모든 DB 작업 성공 시 트랜잭션 커밋
    await connection.commit();

    res.status(201).json({
      message:
        "업무가 성공적으로 생성되었으며, 생성자가 담당자로 자동 배정되었습니다.",
      id: newTaskId,
    });
  } catch (err) {
    console.error("Error creating task and auto-assigning creator:", err);
    // 7. DB 작업 중 오류 발생 시 트랜잭션 롤백
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({
      error: "업무 생성 중 오류가 발생했습니다.",
      details: err.message,
    });
  } finally {
    // 8. 사용한 DB 커넥션 반환
    if (connection) {
      connection.release();
    }
  }
});

app.get("/api/tasks/:taskId", async (req, res) => {
  // 1. URL 경로에서 특정 업무의 ID를 추출합니다.
  const { taskId } = req.params;

  // 2. 업무 상세, 담당자 목록, 댓글 목록을 한 번에 가져오는 통합 쿼리
  const sql = `
    SELECT
        t.*,
        creator.username AS creator_username,
        -- 담당자 목록을 JSON 배열 형태로 가져옵니다.
        (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT('user_id', u.user_id, 'username', u.username)
            )
            FROM task_assignees ta
            JOIN users u ON ta.user_id = u.user_id
            WHERE ta.task_id = t.task_id
        ) AS assignees,
        
        -- 댓글 목록을 JSON 배열 형태로 가져옵니다.
        (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'comment_id', c.comment_id,
                    'content', c.content,
                    'author_id', c.user_id,
                    'author_username', u.username,
                    'created_at', c.created_at
                )
            )
            FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.task_id = t.task_id
            ORDER BY c.created_at ASC
        ) AS comments
    FROM
        tasks AS t
    LEFT JOIN users AS creator ON t.created_by_user_id = creator.user_id
    WHERE
        t.task_id = ?;
  `;

  // 3. 데이터베이스 작업 중 발생할 수 있는 오류를 처리하기 위해 try...catch 사용
  try {
    // 4. 데이터베이스에 쿼리를 실행합니다.
    const [rows] = await db.promise().query(sql, [taskId]);

    // 5. 쿼리 결과 확인 및 클라이언트에게 응답 전송
    if (rows.length === 0) {
      // 해당 ID의 업무를 찾지 못했을 경우
      return res
        .status(404)
        .json({ message: "해당 ID의 업무를 찾을 수 없습니다." });
    }

    // 6. 성공적으로 조회된 업무 정보를 JSON 형태로 전송합니다.
    res.status(200).json(rows[0]);
  } catch (err) {
    // 7. 데이터베이스 작업 중 에러 발생 시 처리
    console.error("업무 상세 정보 조회 중 에러 발생:", err);
    res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
  }
});

// 5.4. 업무 정보 수정 (UPDATE)
app.put("/api/tasks/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const { title, content, due_date, status, requesterId } = req.body; // 요청자 ID 추가

  if (!requesterId) {
    return res.status(401).json({ error: "요청자 ID가 필요합니다." });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const [taskRows] = await connection.query("SELECT project_id FROM tasks WHERE task_id = ?", [taskId]);
    if(taskRows.length === 0) {
        return res.status(404).json({ message: "수정할 업무를 찾을 수 없습니다." });
    }
    const projectId = taskRows[0].project_id;

    const sql = "UPDATE tasks SET task_name = ?, content = ?, due_date = ?, status = ? WHERE task_id = ?";
    const [updateResult] = await connection.query(sql, [title, content, due_date, status, taskId]);

    if (updateResult.affectedRows > 0) {
      // 활동 로그 기록 추가
      await logActivity(connection, requesterId, projectId, taskId, "업무 수정", {
        updatedTaskName: title,
        newStatus: status,
      });
    }

    await connection.commit();
    res.json({ message: "업무가 성공적으로 수정되었습니다." });
  } catch (err) {
    await connection.rollback();
    console.error("업무 수정 중 오류 발생:", err);
    res.status(500).json({ error: "업무 수정 중 오류가 발생했습니다."});
  } finally {
    connection.release();
  }
});
app.delete("/api/tasks/:id", async (req, res) => {
  const { userId } = req.body;
  const { id: taskId } = req.params;

  if (!userId) return res.status(401).json({ error: "인증되지 않은 사용자입니다." });

  const numericTaskId = parseInt(taskId, 10);
  if (isNaN(numericTaskId)) return res.status(400).json({ error: "잘못된 업무 ID 형식입니다." });
  
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const [taskRows] = await connection.query(
        `SELECT t.project_id, t.task_name, pm.role_in_project
         FROM tasks t JOIN project_members pm ON t.project_id = pm.project_id
         WHERE t.task_id = ? AND pm.user_id = ?`, [numericTaskId, userId]);

    if (taskRows.length === 0 || taskRows[0].role_in_project !== 'manager') {
      await connection.rollback();
      return res.status(403).json({ error: "업무를 삭제할 권한이 없습니다." });
    }
    const { project_id, task_name } = taskRows[0];

    // 활동 로그 기록 (삭제 전에!)
    await logActivity(connection, userId, project_id, numericTaskId, "업무 삭제", {
        deletedTaskName: task_name,
    });

    await connection.query("DELETE FROM comments WHERE task_id = ?", [numericTaskId]);
    await connection.query("DELETE FROM task_assignees WHERE task_id = ?", [numericTaskId]);
    await connection.query("DELETE FROM tasks WHERE task_id = ?", [numericTaskId]);
    
    await connection.commit();
    res.json({ message: "업무와 관련 데이터가 성공적으로 삭제되었습니다." });
  } catch(err) {
    await connection.rollback();
    console.error("Error deleting task:", err);
    res.status(500).json({ error: "업무 삭제 중 오류가 발생했습니다." });
  } finally {
    connection.release();
  }
});

// --- 6. 업무 담당자 API (Task Assignees) ---

// 6.1. 특정 업무의 담당자 목록 조회 (GET)
app.get("/api/tasks/:taskId/assignees", async (req, res) => {
  const { taskId } = req.params;
  const numericTaskId = parseInt(taskId, 10);

  if (isNaN(numericTaskId)) {
    return res.status(400).json({ error: "잘못된 업무 ID 형식입니다." });
  }

  // 여기서는 별도의 권한 검사 없이, 해당 taskId의 담당자 목록을 반환합니다.
  // 필요하다면, 요청자가 최소한 해당 프로젝트의 멤버인지 확인하는 로직을 추가할 수 있습니다.
  const sql = `
    SELECT u.user_id, u.username
    FROM task_assignees ta
    JOIN users u ON ta.user_id = u.user_id
    WHERE ta.task_id = ?;
  `;

  try {
    const [assignees] = await db.promise().query(sql, [numericTaskId]);
    res.json(assignees);
  } catch (err) {
    console.error(`Error fetching assignees for task ${numericTaskId}:`, err);
    res.status(500).json({ error: "담당자 목록 조회 중 오류가 발생했습니다." });
  }
});

// 6.2. 업무에 담당자 추가 (POST) - 매니저 권한 필요
app.post("/api/tasks/:taskId/assignees", async (req, res) => {
  const { taskId } = req.params;
  // 클라이언트가 요청 바디에 usernameToAdd와 requesterUserId를 함께 보낸다고 가정
  const { username: usernameToAdd, requesterUserId } = req.body; // <--- 이 부분을 정확히 수정!

  // const requesterUserId = req.user?.user_id; // 이전 코드는 주석 처리 또는 삭제

  // 요청자 ID가 있는지 먼저 확인
  if (!requesterUserId) {
    return res
      .status(401)
      .json({ error: "요청자 ID(requesterUserId)가 필요합니다." });
  }
  if (!usernameToAdd) {
    return res
      .status(400)
      .json({ error: "추가할 담당자의 사용자 이름은 필수입니다." });
  }

  const numericTaskId = parseInt(taskId, 10);
  if (isNaN(numericTaskId)) {
    return res.status(400).json({ error: "잘못된 업무 ID 형식입니다." });
  }

  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    // 1. 요청자가 해당 업무가 속한 프로젝트의 매니저인지 확인
    const [taskProjectRows] = await connection.execute(
      "SELECT project_id FROM tasks WHERE task_id = ?",
      [numericTaskId]
    );
    if (taskProjectRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: "해당 업무를 찾을 수 없습니다." });
    }
    const projectId = taskProjectRows[0].project_id;

    // requesterUserId를 DB 쿼리에 사용 (숫자형으로 변환 권장)
    const numericRequesterUserId = parseInt(requesterUserId, 10);
    if (isNaN(numericRequesterUserId)) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: "잘못된 요청자 ID 형식입니다." });
    }

    const [managerCheckRows] = await connection.execute(
      "SELECT role_in_project FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, numericRequesterUserId] // 수정된 numericRequesterUserId 사용
    );

    if (
      managerCheckRows.length === 0 ||
      managerCheckRows[0].role_in_project !== "manager"
    ) {
      await connection.rollback();
      connection.release();
      return res
        .status(403)
        .json({ error: "담당자를 추가할 권한이 없습니다. (매니저 전용)" });
    }

    // 2. 추가하려는 사용자가 존재하는지, 그리고 해당 프로젝트의 멤버인지 확인
    const [userToAddRows] = await connection.execute(
      "SELECT user_id FROM users WHERE username = ?",
      [usernameToAdd]
    );
    if (userToAddRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res
        .status(404)
        .json({ error: `'${usernameToAdd}' 사용자를 찾을 수 없습니다.` });
    }
    const userIdToAdd = userToAddRows[0].user_id;

    const [projectMemberCheckRows] = await connection.execute(
      "SELECT user_id FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, userIdToAdd]
    );
    if (projectMemberCheckRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        error: `'${usernameToAdd}' 사용자는 이 프로젝트의 멤버가 아닙니다.`,
      });
    }

    // 3. 이미 해당 업무의 담당자인지 확인
    const [existingAssigneeRows] = await connection.execute(
      "SELECT task_id FROM task_assignees WHERE task_id = ? AND user_id = ?",
      [numericTaskId, userIdToAdd]
    );
    if (existingAssigneeRows.length > 0) {
      await connection.rollback();
      connection.release();
      return res.status(409).json({
        error: `'${usernameToAdd}' 사용자는 이미 이 업무의 담당자입니다.`,
      });
    }

    // 4. task_assignees 테이블에 담당자 추가
    await connection.execute(
      "INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)",
      [numericTaskId, userIdToAdd]
    );

    // 5. 활동 로그 기록
    await logActivity(
      connection,
      numericRequesterUserId,
      projectId,
      numericTaskId,
      "업무 권한 부여",
      { assigneeUsername: usernameToAdd }
    ).catch((logErr) =>
      console.error("활동 로그 기록 실패 (담당자 추가):", logErr)
    );

    await connection.commit();
    res.status(201).json({
      message: `'${usernameToAdd}' 사용자가 업무 담당자로 추가되었습니다.`,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error(`Error adding assignee to task ${numericTaskId}:`, err);
    res.status(500).json({
      error: "담당자 추가 중 오류가 발생했습니다.",
      details: err.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// 6.3. 업무에서 담당자 제외 (DELETE) - 매니저 권한 필요
app.delete("/api/tasks/:taskId/assignees/:userIdToRemove", async (req, res) => {
  const { taskId, userIdToRemove } = req.params;
  const requesterUserIdValue = req.query.requesterUserId;

  // ... (기존 ID 유효성 검사 및 파싱) ...
  const numericTaskId = parseInt(taskId, 10);
  const numericUserIdToRemove = parseInt(userIdToRemove, 10);
  const numericRequesterUserId = parseInt(requesterUserIdValue, 10);

  if (
    isNaN(numericTaskId) ||
    isNaN(numericUserIdToRemove) ||
    isNaN(numericRequesterUserId)
  ) {
    return res.status(400).json({ error: "잘못된 ID 형식입니다." });
  }

  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    const [taskProjectRows] = await connection.execute(
      "SELECT project_id FROM tasks WHERE task_id = ?",
      [numericTaskId]
    );
    if (taskProjectRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: "해당 업무를 찾을 수 없습니다." });
    }
    const projectId = taskProjectRows[0].project_id;

    const [managerCheckRows] = await connection.execute(
      "SELECT role_in_project FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, numericRequesterUserId]
    );
    if (
      managerCheckRows.length === 0 ||
      managerCheckRows[0].role_in_project !== "manager"
    ) {
      // 일반 멤버는 누구도 제외할 수 없음 (자기 자신 포함)
      await connection.rollback();
      connection.release();
      return res
        .status(403)
        .json({ error: "담당자를 제외할 권한이 없습니다. (매니저 전용)" });
    }

    // --- 추가 검사: 매니저가 자기 자신을 제외하려 하고, 유일한 담당자인 경우 ---
    if (numericRequesterUserId === numericUserIdToRemove) {
      const [assigneeCountRows] = await connection.execute(
        "SELECT COUNT(*) as count FROM task_assignees WHERE task_id = ?",
        [numericTaskId]
      );
      const assigneeCount = assigneeCountRows[0].count;

      if (assigneeCount <= 1) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          error:
            "자기 자신을 제외할 수 없습니다. 업무에는 최소 한 명의 담당자가 필요합니다. 다른 담당자를 먼저 지정해주세요.",
        });
      }
    }

    // 2. 실제로 해당 사용자가 업무의 담당자인지 확인
    const [assigneeCheckRows] = await connection.execute(
      "SELECT user_id FROM task_assignees WHERE task_id = ? AND user_id = ?",
      [numericTaskId, numericUserIdToRemove]
    );
    if (assigneeCheckRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res
        .status(404)
        .json({ error: "해당 사용자는 이 업무의 담당자가 아닙니다." });
    }

    // 3. task_assignees 테이블에서 담당자 제외
    const [deleteResult] = await connection.execute(
      "DELETE FROM task_assignees WHERE task_id = ? AND user_id = ?",
      [numericTaskId, numericUserIdToRemove]
    );
    if (deleteResult.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res
        .status(404)
        .json({ error: "제외할 담당자를 찾을 수 없거나 이미 제외되었습니다." });
    }

    // 4. 활동 로그 기록
    const [removedUserRows] = await connection.execute(
      "SELECT username FROM users WHERE user_id = ?", 
      [numericUserIdToRemove]
    );

    const removedUsername =
      removedUserRows.length > 0
        ? removedUserRows[0].username
        : `User ID ${numericUserIdToRemove}`;

    // logActivity 함수 호출 시 첫 번째 인자로 현재 트랜잭션 connection 객체를 전달
    await logActivity(
      connection,
      numericRequesterUserId,
      projectId,
      numericTaskId,
      "업무 권한 제외",
      { assigneeUsername: removedUsername }
    ).catch((logErr) =>
      console.error("활동 로그 기록 실패 (담당자 제외):", logErr)
    );
    await connection.commit();
    res.json({
      message: `사용자(ID: ${numericUserIdToRemove})가 업무 담당자에서 제외되었습니다.`,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error(
      `Error removing assignee ${numericUserIdToRemove} from task ${numericTaskId}:`,
      err
    );
    res.status(500).json({
      error: "담당자 제외 중 오류가 발생했습니다.",
      details: err.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// --- 7. 댓글 API (Comments on Tasks) ---

// 7.1. 특정 업무의 모든 댓글 가져오기
app.get("/api/tasks/:taskId/comments", (req, res) => {
  const { taskId } = req.params;
  const sql = `
        SELECT 
            c.comment_id,      
            c.task_id,
            c.user_id,
            c.content,         
            c.created_at,
            u.username         
        FROM comments c
        JOIN users u ON c.user_id = u.user_id  
        WHERE c.task_id = ?
        ORDER BY c.created_at ASC
    `;
  db.query(sql, [taskId], (err, results) => {
    if (err) {
      console.error(`Error fetching comments for task ${taskId}:`, err);
      return res
        .status(500)
        .json({ error: "댓글을 불러오는 중 오류가 발생했습니다." });
    }
    res.json(results);
  });
});

// 7.2. 새로운 댓글 작성
app.post("/api/tasks/:taskId/comments", (req, res) => {
  const { taskId } = req.params;
  const { user_id, content } = req.body;
  if (!user_id || !content) {
    return res
      .status(400)
      .json({ error: "사용자 ID와 댓글 내용은 필수입니다." });
  }

  const sql =
    "INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)";
  db.query(sql, [taskId, user_id, content], (err, result) => {
    if (err) {
      console.error("Error creating comment:", err);
      return res
        .status(500)
        .json({ error: "댓글 작성 중 오류가 발생했습니다." });
    }
    const newCommentId = result.insertId;
    // TODO: 활동 로그 기록
    // TODO: 업무 관련자들에게 댓글 알림 생성
    res
      .status(201)
      .json({ message: "댓글이 성공적으로 작성되었습니다.", id: newCommentId });
  });
});

// 7.3. 댓글 삭제 (새로 추가)
app.delete("/api/comments/:commentId", (req, res) => {
  const { commentId } = req.params;
  const { userId } = req.body; // 요청 본문에서 요청자 ID를 받음 (프론트에서 data: { userId: ... } 로 보내야 함)

  if (!userId) {
    return res.status(400).json({ error: "요청자 ID(userId)가 필요합니다." });
  }

  // 1. 먼저 해당 댓글이 존재하는지, 그리고 요청자가 작성자인지 확인
  const ветеркSql = "SELECT user_id FROM comments WHERE comment_id = ?"; // 'ветеркSql' -> 'checkOwnerSql'
  db.query(ветеркSql, [commentId], (err, results) => {
    // 'ветеркSql' -> 'checkOwnerSql'
    if (err) {
      console.error("Error checking comment owner:", err);
      return res
        .status(500)
        .json({ error: "댓글 정보 확인 중 오류가 발생했습니다." });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "삭제할 댓글을 찾을 수 없습니다." });
    }

    const commentOwnerId = results[0].user_id;
    if (commentOwnerId !== parseInt(userId)) {
      // DB에서 가져온 user_id와 요청으로 온 userId 비교 (타입 일치 중요)
      return res.status(403).json({ error: "댓글을 삭제할 권한이 없습니다." });
    }

    // 2. 권한이 확인되면 댓글 삭제 실행
    const deleteSql = "DELETE FROM comments WHERE comment_id = ?";
    db.query(deleteSql, [commentId], (deleteErr, deleteResult) => {
      if (deleteErr) {
        console.error("Error deleting comment:", deleteErr);
        return res
          .status(500)
          .json({ error: "댓글 삭제 중 오류가 발생했습니다." });
      }

      if (deleteResult.affectedRows === 0) {
        // 이 경우는 거의 발생하지 않아야 함 (이미 위에서 존재 여부 확인)
        return res
          .status(404)
          .json({ error: "삭제할 댓글을 찾을 수 없습니다 (삭제 단계)." });
      }

      // TODO: 활동 로그 기록 (예: 댓글 삭제됨)
      res.status(200).json({ message: "댓글이 성공적으로 삭제되었습니다." });
      // 또는 내용 없이 성공만 알리려면 res.status(204).send();
    });
  });
});

// --- 8. 프로필 API ---
app.get("/api/profile", (req, res) => {
  // 프론트에서 user_id 를 쿼리 파라미터 또는 헤더로 전달한다고 가정
  const userId = req.query.user_id; // 또는 req.headers['user-id']

  if (!userId) {
    return res.status(400).json({ error: "사용자 ID가 필요합니다." });
  }

  const sql = `
    SELECT user_id AS id, username AS name, email, created_at AS createdAt
    FROM users
    WHERE user_id = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching profile:", err);
      return res
        .status(500)
        .json({ error: "프로필 정보를 불러오는 중 오류가 발생했습니다." });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    res.json(results[0]);
  });
});

// 활동 로그 조회 API
app.get("/api/activity_logs", async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) {
    return res
      .status(400)
      .json({ error: "projectId 쿼리 파라미터가 필요합니다." });
  }

  try {
    const [rows] = await db
      .promise()
      .query(
        "SELECT * FROM activity_logs WHERE project_id = ? ORDER BY created_at DESC",
        [projectId]
      );

    res.json(rows);
  } catch (error) {
    console.error("활동 로그 조회 오류:", error);
    res
      .status(500)
      .json({ error: "활동 로그를 불러오는 중 오류가 발생했습니다." });
  }
});

// 사용자 추가
app.post("/api/projects/:projectId/users", async (req, res) => {
  const { projectId } = req.params;
  const { username, requesterId } = req.body; // 요청자 ID 추가

  if (!username) return res.status(400).json({ error: "username이 필요합니다." });
  if (!requesterId) return res.status(401).json({ error: "요청자 ID가 필요합니다." });

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    
    const [users] = await connection.query("SELECT user_id FROM users WHERE username = ?", [username]);
    if (users.length === 0) throw new Error("해당 사용자를 찾을 수 없습니다.");
    
    const userId = users[0].user_id;

    const [exists] = await connection.query("SELECT id FROM project_members WHERE project_id = ? AND user_id = ?", [projectId, userId]);
    if (exists.length > 0) throw new Error("이미 프로젝트에 추가된 사용자입니다.");

    await connection.query("INSERT INTO project_members (project_id, user_id) VALUES (?, ?)", [projectId, userId]);

    // 활동 로그 기록 추가
    await logActivity(connection, requesterId, projectId, null, "사용자 추가", {
        addedUsername: username
    });
    
    await connection.commit();
    res.status(201).json({ message: "사용자 추가 성공!" });
  } catch (err) {
    await connection.rollback();
    // 에러 메시지에 따라 다른 상태 코드 반환
    if(err.message.includes("찾을 수 없습니다")) return res.status(404).json({ error: err.message });
    if(err.message.includes("이미 추가된")) return res.status(409).json({ error: err.message });
    console.error("사용자 추가 중 오류:", err);
    res.status(500).json({ error: "사용자 추가 중 서버 오류가 발생했습니다." });
  } finally {
      connection.release();
  }
});

app.get("/api/projects/:projectId/users", async (req, res) => {
  const { projectId } = req.params;

  try {
    // projects 테이블을 JOIN하고, ORDER BY에 생성자 우선 정렬 조건을 추가합니다.
    const sql = `
      SELECT u.user_id, u.username, u.email, pm.role_in_project
      FROM project_members pm
      JOIN users u ON pm.user_id = u.user_id
      JOIN projects p ON pm.project_id = p.project_id
      WHERE pm.project_id = ?
      ORDER BY
        -- 1순위: 생성자인지 여부 (생성자일 경우 1, 아닐 경우 2)
        CASE
          WHEN p.created_by = u.user_id THEN 1
          ELSE 2
        END,
        -- 2순위: 역할 (매니저일 경우 1, 멤버일 경우 2)
        CASE
          WHEN pm.role_in_project = 'manager' THEN 1
          ELSE 2
        END,
        -- 3순위: 사용자 이름 오름차순
        u.username ASC`;
        
    const [rows] = await db.promise().query(sql, [projectId]);

    res.json(rows);
  } catch (err) {
    console.error("프로젝트 사용자 조회 실패:", err);
    res.status(500).json({ error: "사용자 목록 조회 중 오류 발생" });
  }
});


// --- 8. 프로젝트 멤버 역할 변경 API (매니저 권한 강화 및 로그 기록 추가) ---
app.put("/api/projects/:projectId/members/:memberId", async (req, res) => {
  const { projectId, memberId } = req.params;
  const { requesterId, role: newRole } = req.body;

  if (!requesterId || !newRole || !["manager", "member"].includes(newRole)) {
    return res.status(400).json({ error: "요청 정보가 올바르지 않습니다." });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    
    const [requesterRows] = await connection.query(
      "SELECT role_in_project FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, requesterId]
    );

    if (requesterRows.length === 0 || requesterRows[0].role_in_project !== 'manager') {
      await connection.rollback();
      return res.status(403).json({ error: "멤버의 역할을 변경할 권한이 없습니다. (매니저 전용)" });
    }

    if (newRole === 'member') {
      if (parseInt(requesterId) === parseInt(memberId)) {
        await connection.rollback();
        return res.status(400).json({ error: "자기 자신을 강등시킬 수 없습니다." });
      }
      const [projectRows] = await connection.query("SELECT created_by FROM projects WHERE project_id = ?", [projectId]);
      if (projectRows.length > 0 && projectRows[0].created_by === parseInt(memberId)) {
        await connection.rollback();
        return res.status(403).json({ error: "프로젝트 생성자는 강등시킬 수 없습니다."});
      }
    }
    

    // 1. 역할 업데이트 실행
    const [updateResult] = await connection.query(
      "UPDATE project_members SET role_in_project = ? WHERE project_id = ? AND user_id = ?",
      [newRole, projectId, memberId]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "역할을 변경할 사용자를 찾을 수 없습니다." });
    }

    // 2. 활동 로그 기록 추가
    // 로그에 사용자 이름을 남기기 위해 DB에서 조회합니다.
    const [targetUser] = await connection.query("SELECT username FROM users WHERE user_id = ?", [memberId]);
    await logActivity(connection, requesterId, projectId, null, "사용자 권한 변경", {
        targetUsername: targetUser[0]?.username || `user_id ${memberId}`,
        newRole: newRole
    });

    await connection.commit();
    res.json({ message: "사용자의 역할이 성공적으로 변경되었습니다." });

  } catch (err) {
    await connection.rollback();
    console.error("멤버 역할 변경 중 오류:", err);
    res.status(500).json({ error: "서버 오류로 인해 역할 변경에 실패했습니다." });
  } finally {
    connection.release();
  }
});

// --- 9. 프로젝트 소유권 이전 API ---
app.put("/api/projects/:projectId/owner", async (req, res) => {
  const { projectId } = req.params;
  // requesterId: 현재 소유자, newOwnerId: 새로 소유자가 될 사용자
  const { requesterId, newOwnerId } = req.body;

  if (!requesterId || !newOwnerId) {
    return res
      .status(400)
      .json({ error: "요청자 ID와 새로운 소유자 ID가 모두 필요합니다." });
  }

  if (requesterId === newOwnerId) {
    return res
      .status(400)
      .json({ error: "자기 자신에게 소유권을 이전할 수 없습니다." });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // 1. 현재 프로젝트의 소유자 정보 확인
    const [projectRows] = await connection.query(
      "SELECT created_by FROM projects WHERE project_id = ?",
      [projectId]
    );

    if (projectRows.length === 0) {
      throw new Error("프로젝트를 찾을 수 없습니다.");
    }

    const currentOwnerId = projectRows[0].created_by;

    // 2. 요청자가 현재 소유자인지 권한 확인
    if (currentOwnerId !== requesterId) {
      return res
        .status(403)
        .json({ error: "프로젝트 소유자만 소유권을 이전할 수 있습니다." });
    }

    // 3. 새로운 소유자가 프로젝트 멤버인지 확인
    const [memberRows] = await connection.query(
      "SELECT * FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, newOwnerId]
    );

    if (memberRows.length === 0) {
      return res.status(400).json({
        error: "새로운 소유자는 반드시 프로젝트에 참여한 멤버여야 합니다.",
      });
    }

    // 4. 프로젝트 소유자 변경 (projects 테이블 업데이트)
    await connection.query(
      "UPDATE projects SET created_by = ? WHERE project_id = ?",
      [newOwnerId, projectId]
    );

    // 5. 새로운 소유자의 역할을 'manager'로 승격 (이미 매니저가 아니라면)
    if (memberRows[0].role_in_project !== "manager") {
      await connection.query(
        "UPDATE project_members SET role_in_project = 'manager' WHERE project_id = ? AND user_id = ?",
        [projectId, newOwnerId]
      );
    }

    await connection.commit();
    res.json({ message: "프로젝트 소유권이 성공적으로 이전되었습니다." });
  } catch (err) {
    await connection.rollback();
    console.error("프로젝트 소유권 이전 중 오류:", err);
    res
      .status(500)
      .json({ error: "서버 오류로 인해 소유권 이전에 실패했습니다." });
  } finally {
    connection.release();
  }
});

// --- 11. 프로젝트 멤버 삭제 API ---
app.delete("/api/projects/:projectId/members/:memberId", async (req, res) => {
  const { projectId, memberId } = req.params;
  const { requesterId } = req.body; // 요청자 ID는 body로 받음

  if (!requesterId) {
    return res.status(401).json({ error: "요청자 ID가 필요합니다." });
  }

  // 자기 자신을 삭제하려는 경우 방지
  if (parseInt(requesterId) === parseInt(memberId)) {
    return res.status(400).json({ error: "자기 자신을 프로젝트에서 제외할 수 없습니다." });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // 1. 요청자의 권한 확인 (매니저 여부)
    const [requesterRows] = await connection.query(
      "SELECT role_in_project FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, requesterId]
    );

    if (requesterRows.length === 0 || requesterRows[0].role_in_project !== 'manager') {
      await connection.rollback();
      return res.status(403).json({ error: "멤버를 삭제할 권한이 없습니다. (매니저 전용)" });
    }

    // 2. 삭제 대상이 프로젝트 생성자인지 확인 (생성자 보호)
    const [projectRows] = await connection.query("SELECT created_by FROM projects WHERE project_id = ?", [projectId]);
    if (projectRows.length > 0 && projectRows[0].created_by === parseInt(memberId)) {
      await connection.rollback();
      return res.status(403).json({ error: "프로젝트 생성자는 제외할 수 없습니다." });
    }

    // 3. 로그 기록을 위해 삭제될 사용자의 이름 조회
    const [targetUser] = await connection.query("SELECT username FROM users WHERE user_id = ?", [memberId]);
    if (targetUser.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "삭제할 사용자를 찾을 수 없습니다." });
    }
    const removedUsername = targetUser[0].username;

    // 4. project_members 테이블에서 사용자 삭제
    const [deleteResult] = await connection.query(
      "DELETE FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, memberId]
    );

    if (deleteResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "프로젝트에 해당 사용자가 없거나 이미 제외되었습니다." });
    }

    // 5. 활동 로그 기록
    await logActivity(connection, requesterId, projectId, null, "사용자 추방", {
        removedUsername: removedUsername,
        removedUserId: memberId
    });

    await connection.commit();
    res.json({ message: "사용자가 프로젝트에서 성공적으로 제외되었습니다." });

  } catch (err) {
    await connection.rollback();
    console.error("멤버 삭제 중 오류:", err);
    res.status(500).json({ error: "서버 오류로 인해 멤버 삭제에 실패했습니다." });
  } finally {
    connection.release();
  }
});


// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
