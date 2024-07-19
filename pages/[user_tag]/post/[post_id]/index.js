export async function getServerSideProps(context) {
  const { query } = context;
  const { user_tag, post_id } = query;

  return {
    props: {
      userTag: user_tag,
      postId: post_id,
    },
  };
}

export default function post({ userTag, postId }) {
  return (
    <>
      <p>User tag: {userTag}</p>
      <p>Post id: {postId}</p>
    </>
  );
}
