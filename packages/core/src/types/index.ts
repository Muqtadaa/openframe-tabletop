import { ObjectTypeRegistry } from '../domain/registry.js'
import { codeType } from './code/definition.js'
import { connectorType } from './connector/definition.js'
import { frameType } from './frame/definition.js'
import { groupType } from './group/definition.js'
import { imageType } from './image/definition.js'
import { relationType } from './relation/definition.js'
import { reactionType } from './reaction/definition.js'
import { pollType } from './poll/definition.js'
import { pollAnswerType } from './poll-answer/definition.js'
import { shapeType } from './shape/definition.js'
import { stickyType } from './sticky/definition.js'
import { tableType } from './table/definition.js'
import { textType } from './text/definition.js'
import { unknownType } from './unknown/definition.js'

export { canTidy, tidyCode, tidyKindOf, type TidyKind } from './code/format.js'
export { CODE_TYPE, codeType } from './code/definition.js'
export { CODE_LANGUAGES, CodeDataSchema, MAX_CODE, type CodeData } from './code/schema.js'

export { TABLE_TYPE, tableType } from './table/definition.js'
export {
  MAX_COLUMNS,
  MAX_ROWS,
  TableDataSchema,
  MIN_TRACK,
  CELL_STYLE_KEYS,
  cellIndex,
  cellRange,
  cellRegion,
  styleCells,
  emptyCells,
  dividerPositions,
  resizeTrackAt,
  setTrackSize,
  type CellStyle,
  type CellStylePatch,
  type LineAt,
  type Merge,
  type TableCell,
  type TableData,
  type TableLine,
  type TableLines,
} from './table/schema.js'
export {
  LINE_PRESETS,
  clearCells,
  deleteTracks,
  expandToMerges,
  hasMerge,
  indicesOf,
  insertTracks,
  isCovered,
  lineLookup,
  mergeAt,
  mergeRange,
  rangeBetween,
  resizeGrid,
  setLines,
  unmergeRange,
  wholeTable,
  type Axis,
  type CellRange,
  type LinePreset,
} from './table/grid.js'

export { CONNECTOR_TYPE, connectorType } from './connector/definition.js'
export {
  ARROWHEADS,
  ConnectorDataSchema,
  ROUTINGS,
  type Anchor,
  type Arrowhead,
  type Bend,
  type ConnectorData,
  type LabelPlacement,
  type ConnectorEndpoint,
  type Routing,
} from './connector/schema.js'
export {
  attachmentAnchor,
  endpointDependencies,
  resolveEndpoints,
  type ResolvedEnds,
} from './connector/geometry.js'
export {
  bendAt,
  connectorRoute,
  flattenRoute,
  labelAnchor,
  labelFrom,
  orthogonalLegs,
  orthogonalNodes,
  pointAt,
  routeMidpoint,
  routeNodes,
  routeSegments,
  routeStops,
  routeVertices,
  NO_BEND,
  type LegAnchor,
  type LegAxis,
  type Obstacles,
  type Route,
  type RouteLeg,
  type RouteNormals,
  type RouteSegment,
} from './connector/route.js'
export { FRAME_TYPE, frameType } from './frame/definition.js'
export { GROUP_TYPE, groupType } from './group/definition.js'
export { RELATION_TYPE, relationType } from './relation/definition.js'
export { RelationDataSchema, type RelationData } from './relation/schema.js'
export { REACTION_MARK, REACTION_TYPE, reactionId, reactionType } from './reaction/definition.js'
export {
  GLYPH_PATTERN,
  MarkAuthorSchema,
  ReactionDataSchema,
  type MarkAuthor,
  type ReactionData,
} from './reaction/schema.js'
export { POLL_TYPE, pollType } from './poll/definition.js'
export {
  MAX_POLL_OPTIONS,
  MIN_POLL_OPTIONS,
  POLL_OPTION_ID,
  PollDataSchema,
  type PollData,
  type PollOption,
} from './poll/schema.js'
export {
  POLL_ANSWER_TYPE,
  POLL_MARK,
  SINGLE_CHOICE,
  pollAnswerId,
  pollAnswerType,
} from './poll-answer/definition.js'
export { PollAnswerDataSchema, type PollAnswerData } from './poll-answer/schema.js'
export { GroupDataSchema, type GroupData } from './group/schema.js'
export { IMAGE_TYPE, imageType, placedSize } from './image/definition.js'
export { ImageDataSchema, type ImageCrop, type ImageData } from './image/schema.js'
export {
  cropByHandle,
  isCropped,
  uncrop,
  FULL_CROP,
  type CropBox,
  type CropHandle,
  type CropResult,
} from './image/crop.js'
export { FrameDataSchema, type FrameData } from './frame/schema.js'
export { SHAPE_TYPE, shapeType } from './shape/definition.js'
export { SHAPE_KINDS, ShapeDataSchema, type ShapeData, type ShapeKind } from './shape/schema.js'
export { STICKY_TYPE, stickyType } from './sticky/definition.js'
export { TEXT_TYPE, textType } from './text/definition.js'
export { TextDataSchema, type TextData } from './text/schema.js'
export { StickyDataSchema, type StickyData } from './sticky/schema.js'
export { readableTypeName, UNKNOWN_TYPE, unknownType } from './unknown/definition.js'
export { UnknownDataSchema, type UnknownData } from './unknown/schema.js'

/**
 * The object types this build understands.
 *
 * Registering a new semantic type is a ONE-LINE change here plus a folder of
 * its own. Nothing in the command layer, persistence, undo, culling, hit
 * testing, search or serialization needs to know it exists.
 */
export function createDefaultRegistry(): ObjectTypeRegistry {
  return new ObjectTypeRegistry([
    stickyType,
    textType,
    shapeType,
    frameType,
    connectorType,
    imageType,
    tableType,
    codeType,
    groupType,
    relationType,
    reactionType,
    pollType,
    pollAnswerType,
    unknownType,
  ])
}
