import orchestrator from "./orchestrator";

export default class RequestBuilder {
  baseUrl = "";
  sessionObj;
  headers;

  constructor(urlSegments = "") {
    this.baseUrl = urlSegments.startsWith("http")
      ? urlSegments
      : `${orchestrator.webserverUrl}${urlSegments}`;
  }

  async buildUser(features = { with: [], without: [] }) {
    let userObj = await orchestrator.createUser();

    if (features.with?.length) {
      userObj = await orchestrator.addFeaturesToUser(userObj, features.with);
    }

    if (features.without?.length) {
      userObj = await orchestrator.removeFeaturesFromUser(
        userObj,
        features.without,
      );
    }

    await this.setUser(userObj);

    return userObj;
  }

  async setUser(userObj) {
    this.sessionObj = await orchestrator.createSession(userObj);

    if (this.headers) {
      this.headers.cookie = `session_id=${this.sessionObj.token}`;
    }
  }

  async get(route = "") {
    if (!this.headers) {
      this.buildHeaders();
    }

    const res = await fetch(`${this.baseUrl}${route}`, {
      method: "GET",
      headers: this.headers,
    });

    const resBody = await res.json();

    return { res, resBody };
  }

  async post(routeOrRequestBody, inputRequestBody) {
    const { route, reqBody } = this.getRouteAndRequestBody(
      routeOrRequestBody,
      inputRequestBody,
    );

    if (!this.headers) {
      this.buildHeaders();
    }

    const fetchData = {
      method: "POST",
      headers: this.headers,
    };

    if (reqBody) {
      fetchData.body =
        typeof reqBody === "object" ? JSON.stringify(reqBody) : reqBody;
    }

    const res = await fetch(`${this.baseUrl}${route}`, fetchData);

    const resBody = await res.json();

    return { res, resBody };
  }

  async delete(routeOrRequestBody, inputRequestBody) {
    const { route, reqBody } = this.getRouteAndRequestBody(
      routeOrRequestBody,
      inputRequestBody,
    );

    if (!this.headers) {
      this.buildHeaders();
    }

    const fetchData = {
      method: "DELETE",
      headers: this.headers,
    };

    if (reqBody) {
      fetchData.body =
        typeof reqBody === "object" ? JSON.stringify(reqBody) : reqBody;
    }

    const res = await fetch(`${this.baseUrl}${route}`, fetchData);

    const resBody = await res.json();

    return { res, resBody };
  }

  buildHeaders(customHeaders) {
    const headers = {
      "Content-Type": "application/json",
    };

    if (this.sessionObj) {
      headers.cookie = `session_id=${this.sessionObj.token}`;
    }

    this.headers = { ...headers, ...customHeaders };
    return this.headers;
  }

  getRouteAndRequestBody(routeOrRequestBody = "", inputRequestBody) {
    let route = routeOrRequestBody;
    let reqBody = inputRequestBody;

    if (typeof routeOrRequestBody === "object") {
      route = "";
      reqBody = routeOrRequestBody;
    }

    return {
      route: route,
      reqBody,
    };
  }
}
