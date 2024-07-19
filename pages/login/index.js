import { useRouter } from "next/router";
import { useRef } from "react";

import { useUser } from "pages/interface";

export default function signup() {
  const router = useRouter();

  const { fetchUser } = useUser();

  const emailRef = useRef("");
  const passwordRef = useRef("");

  function toSignup() {
    router.push("/signup");
  }

  async function signupOnSubmit(e) {
    e.preventDefault();

    const info = {
      email: emailRef.current.value,
      password: passwordRef.current.value,
    };

    const res = await fetch("/api/v1/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: info.email,
        password: info.password,
      }),
    });

    if (res.status === 201) {
      fetchUser();
      return;
    }
  }

  return (
    <>
      <h1>Login</h1>
      <button onClick={toSignup}>Cadastrar</button>
      <form onSubmit={signupOnSubmit}>
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
        <button type="submit">Entrar</button>
      </form>
    </>
  );
}
