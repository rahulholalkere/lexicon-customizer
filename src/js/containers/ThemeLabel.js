import React from 'react';
import {connect} from 'react-redux';

let ThemeLabel = ({themeName}) => {
	let themeLabel = themeName || 'No theme selected';

	return (
		<span className="theme-label">{themeLabel}</span>
	);
};

const mapStateToProps = (state, ownProps) => {
	let themeName = state.get('theme');

	if (themeName) {
		themeName = themeName.replace(/.*\/(.*)/, '$1');
	}

	return {
		themeName
	};
};

ThemeLabel = connect(mapStateToProps)(ThemeLabel);

export default ThemeLabel;
