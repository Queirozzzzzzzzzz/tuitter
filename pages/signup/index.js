import { useRouter } from "next/router";
import { useRef } from "react";

export default function signup() {
  const router = useRouter();

  const tagRef = useRef("");
  const usernameRef = useRef("");
  const emailRef = useRef("");
  const passwordRef = useRef("");

  function toLogin() {
    router.push("/login");
  }

  async function signupOnSubmit(e) {
    e.preventDefault();

    const info = {
      tag: tagRef.current.value,
      username: usernameRef.current.value,
      email: emailRef.current.value,
      password: passwordRef.current.value,
    };

    const res = await fetch("/api/v1/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tag: info.tag,
        username: info.username,
        email: info.email,
        password: info.password,
      }),
    });

    if (res.status === 201) {
      router.push("/login");
      return;
    }
  }

  return (
    <>
      <h1>Cadastro</h1>
      <button onClick={toLogin}>Login</button>
      <form onSubmit={signupOnSubmit}>
        <label htmlFor="tag">Tag</label>
        <input
          type="text"
          name="tag"
          ref={tagRef}
          autoComplete="off"
          autoCorrect="off"
        ></input>
        <label htmlFor="username">Usuário</label>
        <input
          type="text"
          name="username"
          ref={usernameRef}
          autoComplete="off"
          autoCorrect="off"
        ></input>
        <label htmlFor="email">Email</label>
        <input
          type="text"
          name="email"
          ref={emailRef}
          autoComplete="off"
          autoCorrect="off"
        ></input>
        <label htmlFor="password">Senha</label>
        <input
          type="password"
          name="password"
          ref={passwordRef}
          autoComplete="off"
          autoCorrect="off"
        ></input>
        <button type="submit">Criar</button>
      </form>
    </>
  );
}
