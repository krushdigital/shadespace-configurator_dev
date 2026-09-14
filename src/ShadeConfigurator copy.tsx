  // Compute footer state per step
  const footerNextLabel = isReviewStep
    ? `Add to cart${calculations.totalPrice > 0 && hasAllEdgeMeasurements ? ' \u00b7 ' + formatCurrency(calculations.totalPrice, config.currency) : ''}`
    : ((openStep === 2 || openStep === 3) && isMeasureGuideVisible)
      ? `Continue > Dimensions`
      : isMobile ? `Next: ${getNextStepTitle(openStep)}` : `Continue > ${getNextStepTitle(openStep)}`;

  const footerDisableNext = false;
  const footerDisabledHint = '';

  const footerPriceDisplay = calculations.totalPrice > 0 && hasAllEdgeMeasurements
    ? formatCurrency(calculations.totalPrice, config.currency)
    : undefined;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mobile Header with progress */}
      <MobileHeader
        currentStep={currentDisplayStep + 1}
        totalSteps={totalVisibleSteps}
        stepLabels={mobileStepLabels}
        onSave={openStep > 0 ? handleSaveQuote : undefined}
        onStepClick={handleRailStepClick}
      />

      <div className="flex bg-surface-panel flex-1 min-h-0 overflow-hidden">
        {/* Left Rail Navigation - tablet+ */}
        <StepRail steps={railSteps} onStepClick={handleRailStepClick} onSave={openStep > 0 ? handleSaveQuote : undefined} />

        {/* Main content area */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-surface-panel">
          <div id="main-scroll-container" className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-content mx-auto px-4 tablet:px-6 desktop:px-8 py-6 tablet:py-8 pb-6 w-full">
            {/* Quote Reference */}
            {quoteReference && (
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-brand-lime/15 border border-brand-lime/30 rounded-full">
                <span className="text-sm font-semibold text-brand-green">
                  Quote: {quoteReference}
                </span>
              </div>
            )}

            {purchasedOrder && (
              <div className="mb-4 bg-teal-50 border border-teal-200 rounded-card p-4 flex items-center gap-3">
                <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-teal-800">
                  <span className="font-semibold">This shade sail has been ordered</span>
                  {purchasedOrder.orderNumber && <span> ({purchasedOrder.orderNumber})</span>}
                  {purchasedOrder.purchasedAt && (
                    <span className="text-teal-600"> on {new Date(purchasedOrder.purchasedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  )}
                </p>
              </div>
            )}

            {/* Step heading — hidden while measuring guide is shown on dimensions steps */}
            {!(isMeasureGuideVisible && (openStep === 2 || openStep === 3)) && (
              <div className="mb-6">
                <div className="flex items-center gap-0">
                  <h1 className="text-heading font-extrabold text-brand-green leading-tight">
                    {steps[openStep]?.title}
                  </h1>
                  {STEP_HELP_CONTENT[openStep] && (
                    <HelpPopover content={STEP_HELP_CONTENT[openStep]} />
                  )}
                </div>
                <p className="mt-1 text-text-muted text-base">
                  {steps[openStep]?.subtitle}
                </p>
              </div>
            )}

            {/* Sketch applied banner */}
            {openStep === 2 && sketchAppliedBanner && (
              <div className="mb-4 flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-card">
                <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-emerald-800">Your sketch measurements have been applied. Please review them below, then continue.</p>
                <button onClick={() => setSketchAppliedBanner(false)} className="ml-auto text-emerald-600 hover:text-emerald-800 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Step content */}
              <div className="min-w-0">
                {ActiveStepComponent && (
                  <ActiveStepComponent
                    key={openStep}
                    config={config}
                    updateConfig={updateConfig}
                    calculations={calculations}
                    validationErrors={validationErrors}
                    typoSuggestions={typoSuggestions}
                    onNext={nextStep}
                    onPrev={prevStep}
                    setValidationErrors={setValidationErrors}
                    setTypoSuggestions={setTypoSuggestions}
                    dismissTypoSuggestion={dismissTypoSuggestion}
                    mobileGuidance={mobileGuidance}
                    // Props for ReviewContent
                    agreedToAcknowledgments={agreedToAcknowledgments}
                    onToggleAgreement={toggleAgreedToAcknowledgments}
                    handleAddToCart={handleAddToCart}
                    allDiagonalsEntered={allDiagonalsEntered}
                    allAcknowledgmentsChecked={allAcknowledgmentsChecked}
                    canAddToCart={canAddToCart}
                    validationTriggered={reviewValidationTrigger}
                    hasAllEdgeMeasurements={hasAllEdgeMeasurements}
                    nextStepTitle={getNextStepTitle(openStep)}
                    showBackButton={shouldShowBackButton(openStep)}
                    isMobile={isMobile}
                    isStepOpen={true}
                    setHighlightedMeasurement={setHighlightedMeasurement}
                    highlightedMeasurement={highlightedMeasurement}
                    highlightedCorner={highlightedCorner}
                    setHighlightedCorner={setHighlightedCorner}
                    canvasRef={canvasRef}
                    measureGuideDismissRef={measureGuideDismissRef}
                    onMeasureGuideVisibilityChange={setIsMeasureGuideVisible}
                    skipMeasureGuide={skipMeasureGuideRef}
                    ref={openStep === 7 ? reviewContentRef : undefined}
                    fabrics={FABRICS}
                    loading={loading}
                    setLoading={setLoading}
                    setShowLoadingOverlay={setShowLoadingOverlay}
                    onSaveQuote={openStep > 0 ? handleSaveQuote : undefined}
                    onSwitchToCustom={(keepMeasurements: boolean) => {
                      const corners = config.corners || (config.fixedShapeType === 'triangle' || config.fixedShapeType === 'right-angle-triangle' ? 3 : 4);
                      const resetFields = { cornerHardware: {}, fixingTypes: undefined, eyeOrientations: undefined };
                      if (keepMeasurements) {
                        updateConfig({ shapeMode: 'custom', fixedShapeType: null, corners, measurementOption: 'adjust', hardwareSelectionMode: undefined, ...resetFields });
                      } else {
                        updateConfig({ shapeMode: 'custom', fixedShapeType: null, corners, measurementOption: 'adjust', hardwareSelectionMode: undefined, measurements: {}, points: generateRegularPolygonPoints(corners), fixingHeights: Array(corners).fill(0), ...resetFields });
                      }
                      setOpenStep(2);
                      setConfig(prev => ({ ...prev, step: Math.max(prev.step, 2) }));
                      setTimeout(() => smoothScrollToStep(2), 150);
                    }}
                    onSwitchToFixed={openStep === 2 ? (shape: import('../types').FixedShapeType, keepMeasurements: boolean) => {
                      const corners = shape === 'triangle' || shape === 'right-angle-triangle' ? 3 : 4;
                      if (keepMeasurements) {
                        const edgeA = config.measurements['AB'] || 0;
                        const edgeB = shape === 'rectangle' ? (config.measurements['BC'] || 0) : shape === 'right-angle-triangle' ? (config.measurements['CA'] || 0) : edgeA;
                        const newMeasurements = computeFixedShapeMeasurements(shape, edgeA, edgeB);
                        const points = generateFixedShapePoints(shape, newMeasurements);
                        updateConfig({ shapeMode: 'fixed', fixedShapeType: shape, corners, measurements: newMeasurements, points, measurementOption: 'exact', hardwareSelectionMode: 'standard' });
                      } else {
                        updateConfig({ shapeMode: 'fixed', fixedShapeType: shape, corners, measurements: {}, points: generateFixedShapePoints(shape, {}), measurementOption: 'exact', hardwareSelectionMode: 'standard', fixingHeights: Array(corners).fill(0) });
                      }
                      setOpenStep(3);
                      setConfig(prev => ({ ...prev, step: Math.max(prev.step, 3) }));
                    } : undefined}
                    onSketchApply={openStep === 2 ? handleSketchApply : undefined}
                    quoteReference={quoteReference}
                    viewMode={openStep === 7 ? desktopViewMode : undefined}
                    onViewModeChange={openStep === 7 ? handleDesktopViewModeChange : undefined}
                    navigateToHeights={openStep === 2 ? navigateToHeights : undefined}
                    setNavigateToHeights={openStep === 2 ? setNavigateToHeights : undefined}
                    navigateToDiagonals={openStep === 2 ? navigateToDiagonals : undefined}
                    setNavigateToDiagonals={openStep === 2 ? setNavigateToDiagonals : undefined}
                    onHeightsSectionChange={openStep === 2 ? setIsHeightsSectionOpen : undefined}
                    device3DTier={device3DTier}
                    mobileViewMode={mobileViewMode}
                    onMobileViewModeChange={handleMobileViewModeChange}
                    pricingSettingsMap={activePricingMap}
                    adminMode={adminMode}
                  />
                )}
              </div>
          </div>
          </div>

          {/* Global sticky bottom bar */}
          <StepNavigationFooter
            onNext={isReviewStep ? handleAddToCartFromConfigurator : () => {
              if (measureGuideDismissRef.current) {
                measureGuideDismissRef.current();
                return;
              }
              nextStep();
            }}
            onPrev={prevStep}
            showBack={shouldShowBackButton(openStep)}
            nextLabel={footerNextLabel}
            disableNext={footerDisableNext}
            disabledHint={footerDisabledHint}
            priceDisplay={footerPriceDisplay}
            isReview={isReviewStep}
            isMobile={isMobile}
          />

          <LoadingOverlay
            isVisible={showLoadingOverlay}
            currentStep={loadingStep.text}
            progress={loadingStep.progress}
          />
        </div>

        {/* Right summary panel - desktop only, DIRECT SIBLING */}
        {!isMobile && (
          <>
            <div
              onMouseDown={handleResizeStart}
              className="hidden desktop:flex w-[6px] flex-shrink-0 cursor-col-resize items-center justify-center h-full bg-transparent hover:bg-border-card/50 active:bg-border-card transition-colors group z-10"
            >
              <div className="w-[2px] h-8 rounded-full bg-border-card group-hover:bg-brand-green/30 group-active:bg-brand-green/50 transition-colors" />
            </div>
            <aside
              className="hidden desktop:block flex-shrink-0 bg-white h-full overflow-y-auto"
              style={{ width: summaryWidth }}
            >
            <div className="p-[28px_24px] flex flex-col gap-4 min-h-full">
                    {/* Sail diagram viewer - always shown */}
                    {isReviewStep ? (
                      <PriceSummaryDisplay
                        config={config}
                        calculations={calculations}
                        onSaveQuote={handleSaveQuote}
                        allAcknowledgmentsChecked={allAcknowledgmentsChecked}
                        canAddToCart={canAddToCart}
                        handleAddToCart={handleAddToCartFromConfigurator}
                        loading={loading}
                        fabrics={FABRICS}
                        isEmailMode={hasAllEdgeMeasurements}
                        adminMode={adminMode}
                      />
                    ) : (
                      <>
                        {/* Your sail viewer card */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-extrabold text-[16px] text-brand-green">Your sail</h4>
                            {config.corners >= 3 && (() => {
                              const desktop3DAvailable = supports3DForCorners(config.corners);
                              if (!desktop3DAvailable) return null;
                              const effectiveDesktopView = desktop3DAvailable ? desktopViewMode : 'plan';
                              return (
                                <div className="flex border-2 border-brand-green rounded-[10px] overflow-hidden">
                                  <button
                                    onClick={() => handleDesktopViewModeChange('plan')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold transition-all ${
                                      effectiveDesktopView === 'plan'
                                        ? 'bg-brand-green text-white'
                                        : 'text-brand-green hover:bg-surface-soft'
                                    }`}
                                  >
                                    Plan
                                  </button>
                                  <button
                                    onClick={() => handleDesktopViewModeChange('3d')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold transition-all ${
                                      effectiveDesktopView === '3d'
                                        ? 'bg-brand-green text-white'
                                        : 'text-brand-green hover:bg-surface-soft'
                                    }`}
                                  >
                                    3D
                                  </button>
                                </div>
                              );
                            })()}
                          </div>

                          {config.corners >= 3 ? (() => {
                            const desktopShapeAccuracy = getShapeAccuracy(config.measurements, config.corners);
                            const desktopDiagonalKeys = config.corners >= 4 ? getDiagonalKeysForCorners(config.corners) : [];
                            const desktopMinDiagonals = config.corners >= 4 ? config.corners - 3 : 0;
                            const desktopProvidedDiagonals = desktopDiagonalKeys.filter(key => config.measurements[key] && config.measurements[key] > 0).length;
                            const desktopHasEnoughDiagonals = desktopProvidedDiagonals >= desktopMinDiagonals && desktopMinDiagonals > 0;
                            const desktop3DAvailable = supports3DForCorners(config.corners);
                            const effectiveDesktopView = desktop3DAvailable ? desktopViewMode : 'plan';

                            return (
                              <div className="bg-surface-panel rounded-card p-[14px]">
                                {(openStep === 5 || openStep === 6) && effectiveDesktopView === 'plan' && (
                                  <p className="text-sm text-text-muted mb-3">
                                    Hover over a corner below to see which corner you are configuring.
                                  </p>
                                )}

                                {effectiveDesktopView === 'plan' ? (
                                  isDiagramStep ? (
                                    <div>
                                      <ShapeCanvas
                                        config={config}
                                        updateConfig={updateConfig}
                                        readonly={openStep !== 2 && openStep !== 3}
                                        snapToGrid={true}
                                        highlightedMeasurement={highlightedMeasurement}
                                        highlightedCorner={highlightedCorner}
                                        highlightedEdgeKeys={fixedEdgeKeys}
                                        isMobile={isMobile}
                                        measurementOption={config.measurementOption}
                                        unit={config.unit}
                                      />
                                      {(openStep === 2 || openStep === 3) && config.corners >= 4 && (
                                        <div className="mt-3">
                                          <ShapeModeToggle
                                            isAutoMode={!config.hasManuallyAdjustedShape}
                                            onToggle={(isAuto) => handleToggleMode(isAuto)}
                                            corners={config.corners}
                                            hasEnoughDiagonals={desktopHasEnoughDiagonals}
                                            shapeAccuracy={desktopShapeAccuracy.accuracy}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <ShapeCanvas
                                      config={config}
                                      updateConfig={updateConfig}
                                      readonly={true}
                                      snapToGrid={true}
                                      highlightedMeasurement={highlightedMeasurement}
                                      highlightedCorner={highlightedCorner}
                                      highlightedEdgeKeys={fixedEdgeKeys}
                                      isMobile={isMobile}
                                      measurementOption={config.measurementOption}
                                      unit={config.unit}
                                    />
                                  )
                                ) : (
                                  <div className="h-[400px] relative group/viewer3d">
                                    <Suspense fallback={
                                      <div className="flex items-center justify-center h-full bg-surface-panel rounded-lg border border-border-card">
                                        <div className="text-center">
                                          <div className="animate-spin w-8 h-8 border-3 border-border-card border-t-brand-green rounded-full mx-auto mb-3"></div>
                                          <p className="text-sm text-text-muted">Loading 3D viewer...</p>
                                        </div>
                                      </div>
                                    }>
                                      <ShadeSail3DViewer
                                        ref={viewer3DRef}
                                        config={config}
                                        highlightedMeasurement={highlightedMeasurement}
                                        highlightedCorner={highlightedCorner}
                                        activeSection={(openStep === 5 || openStep === 6) ? 'hardware' : isHeightsSectionOpen ? 'heights' : 'dimensions'}
                                      />
                                    </Suspense>
                                    <button
                                      onClick={() => setIs3DExpanded(true)}
                                      className="absolute bottom-3 right-3 p-2 bg-white/90 hover:bg-white rounded-lg shadow-md border border-border-card text-text-muted hover:text-brand-green transition-all duration-150 sm:opacity-0 sm:group-hover/viewer3d:opacity-100 sm:focus:opacity-100 z-10"
                                      title="Expand 3D viewer"
                                    >
                                      <Maximize2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })() : (
                            <SailBuildPlaceholder />
                          )}
                        </div>

                        {/* Price card */}
                        <div className="bg-brand-green rounded-card p-[18px_20px]">
                          {calculations.totalPrice > 0 ? (
                            <>
                              <div className="text-[12px] font-bold text-[#9fc4ad] uppercase tracking-wide">Estimated total</div>
                              <div className="text-[32px] font-extrabold text-brand-lime leading-none mt-0.5" style={{ letterSpacing: '-0.03em' }}>
                                {formatCurrency(calculations.totalPrice, config.currency)}
                              </div>
                              <div className="mt-1 text-[13px] text-[#cfe3d4]">All-inclusive to your door. Updates as you go.</div>
                              {calculations.hardwareBreakdown?.hardwareOnlyLivePrice > 0 && (
                                <div className="mt-2 text-[13px] text-[#cfe3d4]">
                                  Includes {formatCurrency(calculations.hardwareBreakdown.hardwareOnlyLivePrice, config.currency)} hardware
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="text-[12px] font-bold text-[#9fc4ad] uppercase tracking-wide">Estimated total</div>
                              <div className="text-[14px] text-[#cfe3d4] mt-1">
                                Price appears after sizing
                              </div>
                            </>
                          )}
                        </div>

                        {/* Selections summary */}
                        <div className="flex flex-col">
                          {[
                            { label: 'Fabric', value: config.fabricType ? FABRICS.find(f => f.id === config.fabricType)?.label : '\u2014' },
                            { label: 'Color', value: config.fabricColor || '\u2014' },
                            { label: 'Shape', value: config.shapeMode ? (config.shapeMode === 'fixed' && config.fixedShapeType ? config.fixedShapeType.replace(/-/g, ' ') : config.shapeMode === 'custom' && config.corners >= 3 ? `Custom ${config.corners}-point` : config.shapeMode) : '\u2014' },
                            { label: 'Edge', value: config.edgeType ? config.edgeType : '\u2014' },
                            { label: 'Hardware', value: config.hardwareSelectionMode ? (config.hardwareSelectionMode === 'standard' ? 'Hardware kit' : config.hardwareSelectionMode === 'manual' ? 'Manual' : 'None') : '\u2014' },
                          ].map((row) => (
                            <div key={row.label} className="flex justify-between gap-3 text-[14px] py-[9px] border-b border-[#eef2ee]">
                              <span className="text-text-muted">{row.label}</span>
                              <span className="font-bold text-right capitalize">{row.value}</span>
                            </div>
                          ))}
                        </div>

                        {/* Fit Guarantee note */}
                        {config.shapeMode === 'custom' && (
                          <div className="text-[13px] text-[#23503f] bg-surface-soft rounded-xl p-[12px_14px] leading-relaxed flex items-start gap-2">
                            <FitGuaranteeBadge className="text-[13px]" /> Doesn&rsquo;t fit the space you measured? We remake it free.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </aside>
              </>
            )}
            </div>

      {/* Unified Save Modal */}
      {adminMode ? (
        <AdminSaveQuoteModal
          isOpen={showUnifiedSaveModal}
          onClose={() => setShowUnifiedSaveModal(false)}
          config={config}
          calculations={calculations}
          adminProfile={adminProfile!}
          pricingSnapshot={pricingSettingsMap}
          existingQuoteId={savedQuoteId}
          existingAccessToken={savedAccessToken}
          existingCustomerDetails={capturedCustomerDetails ?? undefined}
          onQuoteCreated={(ref, id, token) => {
            setQuoteReference(ref);
            setSavedQuoteId(id);
            setSavedAccessToken(token);
            onAdminSaveComplete?.(id, token, ref);
          }}
          getCanvasImageUrl={async () => {
            try {
              const blob = await renderSailPngBlob(config, 800, 800);
              if (!blob) return null;
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `shade-sail-${config.corners}corner-${timestamp}.png`;
              return await uploadToQuoteAssets(blob, filename) || await uploadImageToShopify(blob, filename);
            } catch (err) {
              console.warn('Failed to capture diagram for saved quote:', err);
              return null;
            }
          }}
          getCanvasImage3DUrl={async () => {
            try {
              const screenshot = await viewer3DRef.current?.capture3DScreenshot();
              if (!screenshot) return null;
              const blob = await fetch(screenshot).then(r => r.blob());
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `shade-sail-3d-${config.corners}corner-${timestamp}.png`;
              return await uploadToQuoteAssets(blob, filename);
            } catch (err) {
              console.warn('Failed to capture 3D for saved quote:', err);
              return null;
            }
          }}
        />
      ) : (
        <UnifiedSaveModal
          isOpen={showUnifiedSaveModal}
          onClose={() => setShowUnifiedSaveModal(false)}
          config={config}
          calculations={calculations}
          currentStep={openStep}
          totalSteps={steps.filter((_, i) => !shouldSkipStep(i)).length}
          shouldShowEmailOption={openStep === 7 && hasAllEdgeMeasurements}
          pricingSnapshot={pricingSettingsMap}
          existingQuoteId={savedQuoteId}
          existingAccessToken={savedAccessToken}
          onQuoteCreated={(ref, id, token) => {
            setQuoteReference(ref);
            setSavedQuoteId(id);
            setSavedAccessToken(token);
          }}
          onSaveComplete={() => setLoadedPricingSnapshot(null)}
          onCustomerDetailsCaptured={setCapturedCustomerDetails}
          initialCustomerDetails={capturedCustomerDetails}
          onGeneratePDFWithDetails={handleGeneratePDFWithDetails}
          onEmailPDFQuote={handleEmailPDFQuote}
          getCanvasImageUrl={async () => {
            try {
              const blob = await renderSailPngBlob(config, 800, 800);
              if (!blob) return null;
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `shade-sail-${config.corners}corner-${timestamp}.png`;
              return await uploadToQuoteAssets(blob, filename) || await uploadImageToShopify(blob, filename);
            } catch (err) {
              console.warn('Failed to capture diagram for saved quote:', err);
              return null;
            }
          }}
          getCanvasImage3DUrl={async () => {
            try {
              const screenshot = await viewer3DRef.current?.capture3DScreenshot();
              if (!screenshot) return null;
              const blob = await fetch(screenshot).then(r => r.blob());
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `shade-sail-3d-${config.corners}corner-${timestamp}.png`;
              return await uploadToQuoteAssets(blob, filename);
            } catch (err) {
              console.warn('Failed to capture 3D for saved quote:', err);
              return null;
            }
          }}
        />
      )}

      {is3DExpanded && (
        <Suspense fallback={null}>
          <Expanded3DViewerModal
            isOpen={is3DExpanded}
            onClose={() => setIs3DExpanded(false)}
            config={config}
            highlightedMeasurement={highlightedMeasurement}
            highlightedCorner={highlightedCorner}
            activeSection={(openStep === 5 || openStep === 6) ? 'hardware' : isHeightsSectionOpen ? 'heights' : 'dimensions'}
          />
        </Suspense>
      )}
    </div>
  );
}