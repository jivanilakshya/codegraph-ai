/**
 * Home-page demo graph data.
 * Isolated from production API services.
 * Used ONLY on the landing page as a showcase visualization.
 */

export type HomeNodeKind = "file" | "class" | "function";

export interface HomeGraphNode {
  id: string;
  label: string;
  kind: HomeNodeKind;
  path: string;
  language: string;
}

export interface HomeGraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface HomeGraphData {
  project: string;
  nodes: HomeGraphNode[];
  edges: HomeGraphEdge[];
}

const file = (path: string): HomeGraphNode => ({
  id: path,
  label: path.split("/").pop()!,
  kind: "file",
  path,
  language: "Python",
});

const sym = (
  id: string,
  label: string,
  kind: "class" | "function",
  path: string
): HomeGraphNode => ({ id, label, kind, path, language: "Python" });

const e = (
  source: string,
  target: string,
  type = "imports"
): HomeGraphEdge => ({ source, target, type });

const nodes: HomeGraphNode[] = [
  file("src/app/main.py"),
  file("src/app/routes.py"),
  file("src/app/auth.py"),
  file("src/app/database.py"),
  file("src/app/models.py"),
  file("src/app/middleware.py"),
  file("src/app/config.py"),
  file("src/app/schemas.py"),
  file("src/core/security.py"),
  file("src/core/jwt_manager.py"),
  file("src/core/logging.py"),
  file("src/services/auth_service.py"),
  file("src/services/user_service.py"),
  file("src/utils/helpers.py"),
  file("tests/test_auth.py"),
  sym("JWTManager", "JWTManager", "class", "src/core/jwt_manager.py"),
  sym("AuthService", "AuthService", "class", "src/services/auth_service.py"),
  sym("User", "User", "class", "src/app/models.py"),
  sym(
    "authenticate_user",
    "authenticate_user",
    "function",
    "src/app/auth.py"
  ),
  sym("get_db", "get_db", "function", "src/app/database.py"),
  sym(
    "BaseService",
    "BaseService",
    "class",
    "src/services/user_service.py"
  ),
];

export const homeDemoGraph: HomeGraphData = {
  project: "example-project",
  nodes,
  edges: [
    e("src/app/main.py", "src/app/routes.py"),
    e("src/app/main.py", "src/app/middleware.py"),
    e("src/app/main.py", "src/app/config.py"),
    e("src/app/main.py", "src/app/database.py"),
    e("src/app/routes.py", "src/app/auth.py"),
    e("src/app/routes.py", "src/app/schemas.py"),
    e("src/app/routes.py", "src/services/user_service.py"),
    e("src/app/routes.py", "src/services/auth_service.py"),
    e("src/app/routes.py", "src/utils/helpers.py"),
    e("src/app/auth.py", "src/core/security.py"),
    e("src/app/auth.py", "src/app/models.py"),
    e("src/app/auth.py", "src/app/database.py"),
    e("src/app/auth.py", "src/app/config.py"),
    e("src/app/auth.py", "src/core/jwt_manager.py"),
    e("src/app/auth.py", "authenticate_user", "defines"),
    e("src/app/middleware.py", "src/app/auth.py"),
    e("src/app/middleware.py", "src/core/logging.py"),
    e("src/services/auth_service.py", "src/app/auth.py"),
    e("src/services/auth_service.py", "src/services/user_service.py"),
    e("src/services/auth_service.py", "src/app/models.py"),
    e("src/services/auth_service.py", "AuthService", "defines"),
    e("src/services/user_service.py", "src/app/models.py"),
    e("src/services/user_service.py", "src/app/database.py"),
    e("src/app/models.py", "src/app/database.py"),
    e("src/app/models.py", "User", "defines"),
    e("src/app/database.py", "src/app/config.py"),
    e("src/app/database.py", "get_db", "defines"),
    e("src/core/security.py", "src/app/config.py"),
    e("src/core/jwt_manager.py", "src/app/config.py"),
    e("src/core/jwt_manager.py", "src/core/security.py"),
    e("src/core/jwt_manager.py", "JWTManager", "defines"),
    e("src/core/logging.py", "src/app/config.py"),
    e("src/utils/helpers.py", "src/app/config.py"),
    e("tests/test_auth.py", "src/app/auth.py"),
    e("tests/test_auth.py", "src/services/auth_service.py"),
    e("src/services/user_service.py", "BaseService", "defines"),
    e("AuthService", "BaseService", "inherits"),
    e("authenticate_user", "User", "references"),
    e("get_db", "User", "references"),
    e("authenticate_user", "JWTManager", "calls"),
    e("AuthService", "authenticate_user", "calls"),
  ],
};
