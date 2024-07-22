export async function getServerSideProps(context) {
  const { query } = context;
  const { user_tag, tuit_id } = query;

  return {
    props: {
      userTag: user_tag,
      tuitId: tuit_id,
    },
  };
}

export default function tuit({ userTag, tuitId }) {
  return (
    <>
      <p>User tag: {userTag}</p>
      <p>Tuit id: {tuitId}</p>
    </>
  );
}
