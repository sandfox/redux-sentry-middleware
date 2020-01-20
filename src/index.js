const getUndefined = () => {};
const filter = () => true;
const getType = action => action.type;

const createSentryMiddleware = (Sentry, options = {}) => {
  const {
    breadcrumbDataFromAction = getUndefined,
    breadcrumbMessageFromAction = getType,
    actionTransformer,
    stateTransformer,
    breadcrumbCategory = "redux-action",
    filterBreadcrumbActions = filter,
    getUserContext,
    getTags
  } = options;

  return store => {
    let lastAction;

    Sentry.configureScope(scope => {
      scope.addEventProcessor((event, hint) => {
        const state = store.getState();

        if (actionTransformer) {
          event.extra.lastAction = actionTransformer(lastAction);
        }

        if (stateTransformer) {
          event.extra.state = stateTransformer(state);
        }

        if (getUserContext) {
          event.user = { ...event.user, ...getUserContext(state) };
        }
        if (getTags) {
          const tags = getTags(state);
          Object.keys(tags).forEach(key => {
            event.tags = { ...event.tags, [key]: tags[key] };
          });
        }
        return event;
      });
    });

    return next => action => {
      if (filterBreadcrumbActions(action)) {
        Sentry.addBreadcrumb({
          category: breadcrumbCategory,
          message: breadcrumbMessageFromAction(action),
          level: "info",
          ...(breadcrumbDataFromAction && {
            data: breadcrumbDataFromAction(action)
          })
        });
      }

      lastAction = action;
      return next(action);
    };
  };
};

module.exports = createSentryMiddleware;
