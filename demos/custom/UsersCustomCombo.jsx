import { Combo } from '@svar-ui/react-core';
import UserStub from './UserStub.jsx';

function UsersCustomCombo(props) {
  const { value, options, onChange } = props;

  return (
    <Combo
      options={options}
      value={value}
      onChange={onChange}
      clear
      placeholder="Assign to the person"
    >
      {({ option }) => <UserStub user={option} />}
    </Combo>
  );
}

export default UsersCustomCombo;
