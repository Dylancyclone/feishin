import { css } from '@emotion/react';

export const textEllipsis = css`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const flexBetween = css`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

export const flexCenter = css`
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const flexCenterColumn = css`
  ${flexCenter}
  flex-direction: column;
`;

export const coverBackground = css`
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
`;

export const fadeIn = css`
  animation: fadein 0.3s;

  @keyframes fadein {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }
`;
