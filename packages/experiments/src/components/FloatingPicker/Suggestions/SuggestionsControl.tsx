import * as React from 'react';
import {
  BaseComponent,
  css,
  KeyCodes
} from '../../../Utilities';
import { CommandButton, IButton } from 'office-ui-fabric-react/lib/Button';
import { Spinner } from 'office-ui-fabric-react/lib/Spinner';
import { ISuggestionModel } from 'office-ui-fabric-react/lib/Pickers';
import {
  ISuggestionsHeaderFooterItemProps,
  ISuggestionsControlProps,
  ISuggestionsProps,
  ISuggestionsHeaderFooterProps
} from './Suggestions.types';
import { Suggestions } from './Suggestions';
import * as stylesImport from './SuggestionsControl.scss';

// tslint:disable-next-line:no-any
const styles: any = stylesImport;

export enum SuggestionItemType {
  header,
  suggestion,
  footer,
}

export interface ISuggestionsState {
  selectedHeaderIndex: number;
  selectedFooterIndex: number;
}

export class SuggestionsHeaderFooterItem extends BaseComponent<ISuggestionsHeaderFooterItemProps, {}> {
  public render(): JSX.Element {
    const {
      renderItem,
      onExecute,
      isSelected,
      id,

    } = this.props;
    return (
      onExecute ?
        (
          <CommandButton
            id={ id }
            onClick={ onExecute }
            className={ css(
              'ms-Suggestions-sectionButton',
              styles.actionButton,
              {
                ['is-selected ' + styles.buttonSelected]:
                isSelected
              }) }
          >
            { renderItem() }
          </CommandButton>
        ) :
        (
          <div
            id={ id }
            className={ css(
              'ms-Suggestions-section',
              styles.suggestionsTitle) }
          >
            { renderItem() }
          </div>
        )
    );
  }
}

/**
 * Class when used with SuggestionsStore, renders a suggestions control with customizable headers and footers
 */
export class SuggestionsControl<T> extends BaseComponent<ISuggestionsControlProps<T>, ISuggestionsState> {

  protected _forceResolveButton: IButton;
  protected _searchForMoreButton: IButton;
  protected _selectedElement: HTMLDivElement;
  protected _suggestions: Suggestions<T>;
  private SuggestionsOfProperType: new (props: ISuggestionsProps<T>) => Suggestions<T> =
  Suggestions as new (props: ISuggestionsProps<T>) => Suggestions<T>;

  constructor(suggestionsProps: ISuggestionsControlProps<T>) {
    super(suggestionsProps);

    this.state = {
      selectedHeaderIndex: -1,
      selectedFooterIndex: -1,
    };
  }

  public componentDidMount(): void {
    this.resetSelectedItem();
  }

  public componentDidUpdate(): void {
    this.scrollSelected();
  }

  public componentWillReceiveProps(): void {
    this.resetSelectedItem();
  }

  public componentWillUnmount(): void {
    this._suggestions.deselectAllSuggestions();
  }

  public render(): JSX.Element {
    const {
      className,
      isSearching,
      searchingText,
      headerItemsProps,
      footerItemsProps
    } = this.props;

    return (
      <div
        className={ css(
          'ms-Suggestions',
          className ? className : '',
          styles.root) }
      >
        { headerItemsProps && this.renderHeaderItems() }
        { this._renderSuggestions() }
        { footerItemsProps && this.renderFooterItems() }
        { isSearching ?
          (<Spinner
            className={ css('ms-Suggestions-spinner', styles.suggestionsSpinner) }
            label={ searchingText }
          />) : (null)
        }
      </div>
    );
  }

  public get currentSuggestion(): ISuggestionModel<T> {
    return this._suggestions.getCurrentItem();
  }

  public hasSuggestionSelected(): boolean {
    return this._suggestions.hasSuggestionSelected();
  }

  public hasSelection(): boolean {
    let { selectedHeaderIndex, selectedFooterIndex } = this.state;
    return selectedHeaderIndex !== -1 || this.hasSuggestionSelected() || selectedFooterIndex !== -1;
  }

  public executeSelectedAction(): void {
    let { headerItemsProps, footerItemsProps } = this.props;
    let { selectedHeaderIndex, selectedFooterIndex } = this.state;

    if (headerItemsProps && selectedHeaderIndex !== -1 && selectedHeaderIndex < headerItemsProps.length) {
      let selectedHeaderItem = headerItemsProps[selectedHeaderIndex];
      if (selectedHeaderItem.onExecute) {
        selectedHeaderItem.onExecute();
      }
    } else if (this._suggestions.hasSuggestionSelected()) {
      this.props.completeSuggestion();
    } else if (footerItemsProps && selectedFooterIndex !== -1 && selectedFooterIndex < footerItemsProps.length) {
      let selectedFooterItem = footerItemsProps[selectedFooterIndex];
      if (selectedFooterItem.onExecute) {
        selectedFooterItem.onExecute();
      }
    }
  }

  public removeSuggestion(index?: number): void {
    this._suggestions.removeSuggestion(index ? index : this._suggestions.currentIndex);
  }

  /**
   * Handles the key down, returns true, if the event was handled, false otherwise
   * @param keyCode The keyCode to handle
   */
  public handleKeyDown(keyCode: number): boolean {
    let { selectedHeaderIndex, selectedFooterIndex } = this.state;
    let isKeyDownHandled = false;
    if (keyCode === KeyCodes.down) {
      if (selectedHeaderIndex === -1 && !this._suggestions.hasSuggestionSelected() && selectedFooterIndex === -1) {
        this.selectFirstItem();
      } else if (selectedHeaderIndex !== -1) {
        this.selectNextItem(SuggestionItemType.header);
        isKeyDownHandled = true;
      } else if (this._suggestions.hasSuggestionSelected()) {
        this.selectNextItem(SuggestionItemType.suggestion);
        isKeyDownHandled = true;
      } else if (selectedFooterIndex !== -1) {
        this.selectNextItem(SuggestionItemType.footer);
        isKeyDownHandled = true;
      }
    } else if (keyCode === KeyCodes.up) {
      if (selectedHeaderIndex === -1 && !this._suggestions.hasSuggestionSelected() && selectedFooterIndex === -1) {
        this.selectLastItem();
      } else if (selectedHeaderIndex !== -1) {
        this.selectPreviousItem(SuggestionItemType.header);
        isKeyDownHandled = true;
      } else if (this._suggestions.hasSuggestionSelected()) {
        this.selectPreviousItem(SuggestionItemType.suggestion);
        isKeyDownHandled = true;
      } else if (selectedFooterIndex !== -1) {
        this.selectPreviousItem(SuggestionItemType.footer);
        isKeyDownHandled = true;
      }
    } else if (keyCode === KeyCodes.enter
      || keyCode === KeyCodes.tab) {
      if (this.hasSelection()) {
        this.executeSelectedAction();
        isKeyDownHandled = true;
      }
    }

    return isKeyDownHandled;
  }

  // TODO get the element to scroll into view properly regardless of direction.
  public scrollSelected(): void {
    if (this._selectedElement) {
      this._selectedElement.scrollIntoView(false);
    }
  }

  protected renderHeaderItems(): JSX.Element | null {
    const { headerItemsProps, suggestionsHeaderContainerAriaLabel } = this.props;
    const { selectedHeaderIndex } = this.state;

    return headerItemsProps ? (
      <div
        className={ css('ms-Suggestions-headerContainer', styles.suggestionsContainer) }
        id='suggestionHeader-list'
        role='list'
        aria-label={ suggestionsHeaderContainerAriaLabel }
      >
        { headerItemsProps.map((headerItemProps: ISuggestionsHeaderFooterProps, index: number) => {
          let isSelected = selectedHeaderIndex !== -1 && selectedHeaderIndex === index;
          return (
            headerItemProps.shouldShow() ? <div
              ref={ this._resolveRef(isSelected ? '_selectedElement' : '') }
              id={ 'sug-header' + index }
              role='listitem'
              aria-label={ headerItemProps.ariaLabel }
            >
              <SuggestionsHeaderFooterItem
                id={ 'sug-header-item' + index }
                isSelected={ isSelected }
                renderItem={ headerItemProps.renderItem }
                onExecute={ headerItemProps.onExecute }
                className={ headerItemProps.className }
              />
            </div> : null
          );
        }) }
      </div>) : null;
  }

  protected renderFooterItems(): JSX.Element | null {
    const { footerItemsProps, suggestionsFooterContainerAriaLabel } = this.props;
    let { selectedFooterIndex } = this.state;
    return footerItemsProps ? (
      <div
        className={ css('ms-Suggestions-footerContainer', styles.suggestionsContainer) }
        id='suggestionFooter-list'
        role='list'
        aria-label={ suggestionsFooterContainerAriaLabel }
      >
        { footerItemsProps.map((footerItemProps: ISuggestionsHeaderFooterProps, index: number) => {
          let isSelected = selectedFooterIndex !== -1 && selectedFooterIndex === index;
          return (
            footerItemProps.shouldShow() ? <div
              ref={ this._resolveRef(isSelected ? '_selectedElement' : '') }
              id={ 'sug-footer' + index }
              role='listitem'
              aria-label={ footerItemProps.ariaLabel }
            >
              <SuggestionsHeaderFooterItem
                id={ 'sug-footer-item' + index }
                isSelected={ isSelected }
                renderItem={ footerItemProps.renderItem }
                onExecute={ footerItemProps.onExecute }
                className={ footerItemProps.className }
              />
            </div> : null
          );
        }) }
      </div>) : null;
  }

  protected _renderSuggestions(): JSX.Element {
    const TypedSuggestions = this.SuggestionsOfProperType;

    return (
      <TypedSuggestions
        ref={ this._resolveRef('_suggestions') }
        { ...this.props as ISuggestionsProps<T>}
      />);
  }

  /**
   * Selects the next selectable item
   */
  protected selectNextItem(itemType: SuggestionItemType, originalItemType?: SuggestionItemType): void {
    // If the recursive calling has not found a selectable item in the other suggestion item type groups
    // And the method is being called again with the original item type,
    // Select the first selectable item of this suggestion item type group (could be the currently selected item)
    if (itemType === originalItemType) {
      this._selectNextItemOfItemType(itemType);
      return;
    }

    let startedItemType = originalItemType !== undefined ? originalItemType : itemType;

    // Try to set the selection to the next selectable item, of the same suggestion item type group
    // If this is the original item type, use the current index
    let selectionChanged = this._selectNextItemOfItemType(
      itemType,
      startedItemType === itemType ? this._getCurrentIndexForType(itemType) : undefined);

    // If the selection did not change, try to select from the next suggestion type group
    if (!selectionChanged) {

      this.selectNextItem(this._getNextItemSectionType(itemType), startedItemType);
    }
  }

  /**
   * Selects the previous selectable item
   */
  protected selectPreviousItem(itemType: SuggestionItemType, originalItemType?: SuggestionItemType): void {
    // If the recursive calling has not found a selectable item in the other suggestion item type groups
    // And the method is being called again with the original item type,
    // Select the last selectable item of this suggestion item type group (could be the currently selected item)
    if (itemType === originalItemType) {
      this._selectPreviousItemOfItemType(itemType);
      return;
    }

    let startedItemType = originalItemType !== undefined ? originalItemType : itemType;

    // Try to set the selection to the previous selectable item, of the same suggestion item type group
    let selectionChanged = this._selectPreviousItemOfItemType(
      itemType,
      startedItemType === itemType ? this._getCurrentIndexForType(itemType) : undefined);

    // If the selection did not change, try to select from the previous suggestion type group
    if (!selectionChanged) {

      this.selectPreviousItem(this._getPreviousItemSectionType(itemType), startedItemType);
    }
  }

  /**
   * Resets the selected state and selects the first selectable item
   */
  protected resetSelectedItem(): void {
    this.setState({ selectedHeaderIndex: -1, selectedFooterIndex: -1 });
    this._suggestions.deselectAllSuggestions();

    // Select the first item if the shouldSelectFirstItem prop is not set or it is set and it returns true
    if (this.props.shouldSelectFirstItem === undefined || this.props.shouldSelectFirstItem()) {
      this.selectFirstItem();
    }
  }

  /**
   * Selects the first item
   */
  protected selectFirstItem(): void {
    if (this._selectNextItemOfItemType(SuggestionItemType.header)) {
      return;
    }

    if (this._selectNextItemOfItemType(SuggestionItemType.suggestion)) {
      return;
    }

    this._selectNextItemOfItemType(SuggestionItemType.footer);
  }

  /**
   * Selects the last item
   */
  protected selectLastItem(): void {
    if (this._selectPreviousItemOfItemType(SuggestionItemType.footer)) {
      return;
    }

    if (this._selectPreviousItemOfItemType(SuggestionItemType.suggestion)) {
      return;
    }

    this._selectPreviousItemOfItemType(SuggestionItemType.header);
  }

  /**
   * Selects the next item in the suggestion item type group, given the current index
   * If none is able to be selected, returns false, otherwise returns true
   * @param itemType The suggestion item type
   * @param currentIndex The current index, default is -1
   */
  private _selectNextItemOfItemType(itemType: SuggestionItemType, currentIndex: number = -1): boolean {
    if (itemType === SuggestionItemType.suggestion) {
      if (this.props.suggestions.length > currentIndex + 1) {
        this._suggestions.setSelectedSuggestion(currentIndex + 1);
        this.setState({ selectedHeaderIndex: -1, selectedFooterIndex: -1 });
        return true;
      }
    } else {
      let isHeader = itemType === SuggestionItemType.header;
      let itemProps = isHeader ? this.props.headerItemsProps : this.props.footerItemsProps;

      if (itemProps && itemProps.length > currentIndex + 1) {
        for (let i = currentIndex + 1; i < itemProps.length; i++) {
          let item = itemProps[i];
          if (item.onExecute && item.shouldShow()) {
            this.setState({ selectedHeaderIndex: isHeader ? i : -1 });
            this.setState({ selectedFooterIndex: isHeader ? -1 : i });
            this._suggestions.deselectAllSuggestions();
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
 * Selects the previous item in the suggestion item type group, given the current index
 * If none is able to be selected, returns false, otherwise returns true
 * @param itemType The suggestion item type
 * @param currentIndex The current index. If none is provided, the default is the items length of specified type
 */
  private _selectPreviousItemOfItemType(itemType: SuggestionItemType, currentIndex?: number): boolean {
    if (itemType === SuggestionItemType.suggestion) {
      let index = currentIndex !== undefined ? currentIndex : this.props.suggestions.length;
      if (index > 0) {
        this._suggestions.setSelectedSuggestion(index - 1);
        this.setState({ selectedHeaderIndex: -1, selectedFooterIndex: -1 });
        return true;
      }
    } else {
      let isHeader = itemType === SuggestionItemType.header;
      let itemProps = isHeader ? this.props.headerItemsProps : this.props.footerItemsProps;
      if (itemProps) {
        let index = currentIndex !== undefined ? currentIndex : itemProps.length;
        if (index > 0) {
          for (let i = index - 1; i >= 0; i--) {
            let item = itemProps[i];
            if (item.onExecute && item.shouldShow()) {
              this.setState({ selectedHeaderIndex: isHeader ? i : -1 });
              this.setState({ selectedFooterIndex: isHeader ? -1 : i });
              this._suggestions.deselectAllSuggestions();
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  private _getCurrentIndexForType(itemType: SuggestionItemType): number {
    switch (itemType) {
      case SuggestionItemType.header:
        return this.state.selectedHeaderIndex;
      case SuggestionItemType.suggestion:
        return this._suggestions.currentIndex;
      case SuggestionItemType.footer:
        return this.state.selectedFooterIndex;
    }
  }

  private _getNextItemSectionType(itemType: SuggestionItemType): SuggestionItemType {
    switch (itemType) {
      case SuggestionItemType.header:
        return SuggestionItemType.suggestion;
      case SuggestionItemType.suggestion:
        return SuggestionItemType.footer;
      case SuggestionItemType.footer:
        return SuggestionItemType.header;
    }
  }

  private _getPreviousItemSectionType(itemType: SuggestionItemType): SuggestionItemType {
    switch (itemType) {
      case SuggestionItemType.header:
        return SuggestionItemType.footer;
      case SuggestionItemType.suggestion:
        return SuggestionItemType.header;
      case SuggestionItemType.footer:
        return SuggestionItemType.suggestion;
    }
  }
}